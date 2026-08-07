package co.ke.pesabank.shared.audit;

import co.ke.pesabank.security.domain.User;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(User actor, String action, String target, String details) {
        AuditEntry entry = new AuditEntry();
        entry.setActorId(actor != null ? actor.getId() : null);
        entry.setActorName(actor != null ? actor.getFullName() : "system");
        entry.setActorRole(actor != null ? actor.getRole().name() : "SYSTEM");
        entry.setAction(action);
        entry.setTarget(target);
        entry.setDetails(details);
        entry.setIp(resolveIp());
        repository.save(entry);
    }

    private String resolveIp() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            HttpServletRequest req = attrs.getRequest();
            String forwarded = req.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
            return req.getRemoteAddr();
        } catch (Exception ex) {
            return null;
        }
    }
}