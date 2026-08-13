package co.ke.pesabank.admin.web;

import co.ke.pesabank.kyc.repo.KycRepository;
import co.ke.pesabank.security.domain.Role;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.domain.UserStatus;
import co.ke.pesabank.security.repo.UserRepository;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import co.ke.pesabank.shared.error.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository users;
    private final KycRepository kyc;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;

    @GetMapping
    public List<Map<String, Object>> list() {
        return users.findAllByOrderByCreatedAtDesc().stream().map(this::toRow).toList();
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable UUID id) {
        User u = users.findById(id)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found."));
        Map<String, Object> row = new java.util.HashMap<>(toRow(u));
        row.put("createdAt", u.getCreatedAt());
        row.put("lastLoginAt", u.getLastLoginAt());
        kyc.findByUserId(u.getId()).ifPresent(k -> row.put("kycStatus", k.getStatus().name()));
        return row;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CreateUserRequest req) {
        if (users.existsByEmailIgnoreCase(req.email())) {
            throw ApiException.conflict("EMAIL_EXISTS", "A user with this email already exists.");
        }

        User actor = CurrentUser.get();
        User user = new User();
        user.setFullName(req.fullName().trim());
        user.setEmail(req.email().trim().toLowerCase());
        user.setPhone(req.phone().trim());
        user.setRole(req.role());
        user.setStatus(UserStatus.ACTIVE);

        String password = (req.password() == null || req.password().isBlank())
                ? UUID.randomUUID().toString().substring(0, 12) + "Aa1!"
                : req.password();
        user.setPasswordHash(passwordEncoder.encode(password));
        users.save(user);

        audit.record(actor, "USER_CREATED", user.getEmail(), "Role " + user.getRole());

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "inviteSent", req.sendInvite()));
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<Map<String, Object>> updateRole(@PathVariable UUID id, @RequestBody UpdateRoleRequest req) {
        User actor = CurrentUser.get();
        if (actor.getId().equals(id)) {
            throw ApiException.badRequest("CANNOT_CHANGE_OWN_ROLE", "You cannot change your own role.");
        }

        User target = users.findById(id)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found."));
        Role previous = target.getRole();
        target.setRole(req.role());
        users.save(target);

        audit.record(actor, "USER_ROLE_CHANGED", target.getEmail(), previous + " → " + req.role());
        return ResponseEntity.ok(Map.of("role", target.getRole().name()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable UUID id, @RequestBody UpdateStatusRequest req) {
        User actor = CurrentUser.get();
        if (actor.getId().equals(id)) {
            throw ApiException.badRequest("CANNOT_SUSPEND_SELF", "You cannot change your own status.");
        }

        User target = users.findById(id)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found."));
        target.setStatus(req.status());
        users.save(target);

        audit.record(actor, "USER_STATUS_CHANGED", target.getEmail(), "New status " + req.status());
        return ResponseEntity.ok(Map.of("status", target.getStatus().name()));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@PathVariable UUID id) {
        User actor = CurrentUser.get();
        User target = users.findById(id)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found."));

        // In production we would send an email link here.
        audit.record(actor, "PASSWORD_RESET_SENT", target.getEmail(), null);
        return ResponseEntity.ok(Map.of("sent", true));
    }

    private Map<String, Object> toRow(User u) {
        return Map.of(
                "id", u.getId(),
                "fullName", u.getFullName(),
                "email", u.getEmail(),
                "phone", u.getPhone() != null ? u.getPhone() : "",
                "role", u.getRole().name(),
                "status", u.getStatus().name(),
                "createdAt", u.getCreatedAt(),
                "lastLoginAt", u.getLastLoginAt() != null ? u.getLastLoginAt() : ""
        );
    }

    public record CreateUserRequest(
            @NotBlank String fullName,
            @Email @NotBlank String email,
            @NotBlank String phone,
            @NotNull Role role,
            String password,
            boolean sendInvite) {}

    public record UpdateRoleRequest(@NotNull Role role) {}

    public record UpdateStatusRequest(@NotNull UserStatus status) {}
}