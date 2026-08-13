package co.ke.pesabank.admin.web;

import co.ke.pesabank.shared.audit.AuditEntry;
import co.ke.pesabank.shared.audit.AuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit")
@RequiredArgsConstructor
public class AdminAuditController {

    private final AuditRepository repo;

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "200") int limit) {
        return repo.findAllByOrderByCreatedAtDesc(PageRequest.of(0, Math.min(limit, 500)))
                .stream()
                .map(this::dto)
                .toList();
    }

    private Map<String, Object> dto(AuditEntry e) {
        return Map.of(
                "id", e.getId(),
                "actorName", e.getActorName(),
                "actorRole", e.getActorRole(),
                "action", e.getAction(),
                "target", e.getTarget(),
                "ip", e.getIp() != null ? e.getIp() : "—",
                "createdAt", e.getCreatedAt(),
                "details", e.getDetails() != null ? e.getDetails() : "");
    }
}