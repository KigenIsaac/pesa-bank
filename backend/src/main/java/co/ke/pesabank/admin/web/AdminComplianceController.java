package co.ke.pesabank.admin.web;

import co.ke.pesabank.admin.domain.ComplianceAlert;
import co.ke.pesabank.admin.service.ComplianceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/compliance")
@RequiredArgsConstructor
public class AdminComplianceController {

    private final ComplianceService service;

    @GetMapping("/alerts")
    public List<Map<String, Object>> alerts() {
        return service.list().stream().map(this::dto).toList();
    }

    private Map<String, Object> dto(ComplianceAlert a) {
        java.util.HashMap<String, Object> m = new java.util.HashMap<>();
        m.put("id", a.getId());
        m.put("type", a.getType().name());
        m.put("severity", a.getSeverity().name());
        m.put("title", a.getTitle());
        m.put("detail", a.getDetail() != null ? a.getDetail() : "");
        m.put("status", a.getStatus().name());
        m.put("createdAt", a.getCreatedAt());
        if (a.getRelatedTransactionId() != null) m.put("relatedTransactionId", a.getRelatedTransactionId());
        if (a.getRelatedUserId() != null) m.put("relatedUserId", a.getRelatedUserId());
        return m;
    }
}