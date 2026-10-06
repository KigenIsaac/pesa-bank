package co.ke.pesabank.security.auth;

import co.ke.pesabank.security.auth.dto.AuthResponse;
import co.ke.pesabank.security.auth.dto.LoginRequest;
import co.ke.pesabank.security.auth.dto.RegisterRequest;
import co.ke.pesabank.security.domain.Role;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.domain.UserStatus;
import co.ke.pesabank.security.jwt.JwtService;
import co.ke.pesabank.security.repo.UserRepository;
import co.ke.pesabank.shared.audit.AuditService;
import co.ke.pesabank.shared.error.ApiException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        User user = userRepository.findByEmailIgnoreCase(req.email())
                .orElseThrow(() -> ApiException.unauthorized("INVALID_CREDENTIALS", "Incorrect email or password."));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("INVALID_CREDENTIALS", "Incorrect email or password.");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.forbidden("ACCOUNT_NOT_ACTIVE", "Your account is not active. Contact support.");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String token = jwtService.generate(user);
        auditService.record(user, "LOGIN", user.getEmail(), "Successful sign-in");

        return ResponseEntity.ok(new AuthResponse(token, user.getRole().name(), user.getEmail(), user.getFullName()));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw ApiException.conflict("EMAIL_EXISTS", "An account with this email already exists.");
        }

        User user = new User();
        user.setFullName(req.fullName().trim());
        user.setEmail(req.email().trim().toLowerCase());
        user.setPhone(req.phone().trim());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setRole(Role.CUSTOMER);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        String token = jwtService.generate(user);
        auditService.record(user, "REGISTER", user.getEmail(), "Self-registration");

        return ResponseEntity.ok(new AuthResponse(token, user.getRole().name(), user.getEmail(), user.getFullName()));
    }
}