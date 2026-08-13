package co.ke.pesabank.admin.web;

import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import co.ke.pesabank.teller.domain.ReversalRequest;
import co.ke.pesabank.teller.repo.ReversalRepository;
import co.ke.pesabank.teller.service.ReversalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/reversals")
@RequiredArgsConstructor
public class AdminReversalController {

    private final ReversalRepository repo;
    private final ReversalService service;
    private final AuditService audit;

    @GetMapping
    public List<Map<String, Object>> list() {
        return repo.findAllByOrderByCreatedAtDesc().stream().map(this::dto).toList();
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Map<String, Object>> approve(@PathVariable UUID id) {
        User admin = CurrentUser.get();
        ReversalRequest r = service.approve(id, admin);
        audit.record(admin, "REVERSAL_APPROVED", r.getTransactionReference(), r.getReason());
        return ResponseEntity.ok(Map.of("status", r.getStatus().name()));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Map<String, Object>> reject(@PathVariable UUID id) {
        User admin = CurrentUser.get();
        ReversalRequest r = service.reject(id, admin);
        audit.record(admin, "REVERSAL_REJECTED", r.getTransactionReference(), r.getReason());
        return ResponseEntity.ok(Map.of("status", r.getStatus().name()));
    }

    private Map<String, Object> dto(ReversalRequest r) {
        return Map.ofEntries(
                Map.entry("id", r.getId()),
                Map.entry("transactionId", r.getTransactionId()),
                Map.entry("transactionReference", r.getTransactionReference()),
                Map.entry("accountNumber", r.getAccountNumber() != null ? r.getAccountNumber() : ""),
                Map.entry("amount", r.getAmount() != null ? r.getAmount() : 0),
                Map.entry("currency", "KES"),
                Map.entry("requestedBy", r.getRequestedByName() != null ? r.getRequestedByName() : "—"),
                Map.entry("reason", r.getReason()),
                Map.entry("status", r.getStatus().name()),
                Map.entry("requestedAt", r.getCreatedAt()),
                Map.entry("decidedAt", r.getDecidedAt() != null ? r.getDecidedAt() : ""),
                Map.entry("decidedBy", r.getDecidedByName() != null ? r.getDecidedByName() : "")
        );
    }
}