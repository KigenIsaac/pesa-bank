package co.ke.pesabank.security.me;

import co.ke.pesabank.kyc.domain.KycRecord;
import co.ke.pesabank.kyc.repo.KycRepository;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.repo.UserRepository;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import co.ke.pesabank.shared.error.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final UserRepository userRepository;
    private final KycRepository kycRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @GetMapping
    public Map<String, Object> get() {
        User user = CurrentUser.get();
        Optional<KycRecord> kyc = kycRepository.findByUserId(user.getId());

        Map<String, Object> body = new HashMap<>();
        body.put("id", user.getId());
        body.put("fullName", user.getFullName());
        body.put("email", user.getEmail());
        body.put("phone", user.getPhone());
        body.put("role", user.getRole().name());
        body.put("twoFactorEnabled", user.isTwoFactorEnabled());

        kyc.ifPresent(k -> {
            Map<String, Object> kycMap = new HashMap<>();
            kycMap.put("status", k.getStatus().name());
            kycMap.put("idType", k.getIdType() != null ? k.getIdType().name() : null);
            kycMap.put("idNumber", k.getIdNumber());
            kycMap.put("kraPin", k.getKraPin());
            body.put("kyc", kycMap);
        });

        return body;
    }

    @PatchMapping
    public ResponseEntity<Map<String, Object>> update(@RequestBody UpdateProfileRequest req) {
        User user = CurrentUser.get();
        if (req.fullName() != null && !req.fullName().isBlank()) user.setFullName(req.fullName().trim());
        if (req.phone() != null && !req.phone().isBlank()) user.setPhone(req.phone().trim());
        userRepository.save(user);
        auditService.record(user, "PROFILE_UPDATED", user.getEmail(), null);
        return ResponseEntity.ok(Map.of("updated", true));
    }

    @PostMapping("/password")
    public ResponseEntity<Map<String, Object>> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        User user = CurrentUser.get();
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw ApiException.unauthorized("WRONG_PASSWORD", "Your current password is incorrect.");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        auditService.record(user, "PASSWORD_CHANGED", user.getEmail(), null);
        return ResponseEntity.ok(Map.of("updated", true));
    }

    public record UpdateProfileRequest(String fullName, String phone) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8) String newPassword) {}
}