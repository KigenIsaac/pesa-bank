package co.ke.pesabank.notification.web;

import co.ke.pesabank.notification.domain.Notification;
import co.ke.pesabank.notification.repo.NotificationRepository;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.error.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository repo;

    @GetMapping
    public List<Map<String, Object>> list() {
        User user = CurrentUser.get();
        return repo.findAllByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(this::dto).toList();
    }

    @GetMapping("/unread-count")
    public Map<String, Object> unreadCount() {
        User user = CurrentUser.get();
        return Map.of("count", repo.countByUserIdAndReadFalse(user.getId()));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markRead(@PathVariable UUID id) {
        User user = CurrentUser.get();
        Notification n = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("NOTIFICATION_NOT_FOUND", "Notification not found."));
        if (!n.getUserId().equals(user.getId())) {
            throw ApiException.forbidden("NOT_YOUR_NOTIFICATION", "You don't have access to this notification.");
        }
        n.setRead(true);
        repo.save(n);
        return ResponseEntity.ok(Map.of("read", true));
    }

    @PostMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllRead() {
        User user = CurrentUser.get();
        List<Notification> unread = repo.findAllByUserIdAndReadFalse(user.getId());
        unread.forEach(n -> n.setRead(true));
        repo.saveAll(unread);
        return ResponseEntity.ok(Map.of("count", unread.size()));
    }

    private Map<String, Object> dto(Notification n) {
        java.util.HashMap<String, Object> m = new java.util.HashMap<>();
        m.put("id", n.getId());
        m.put("type", n.getType().name());
        m.put("title", n.getTitle());
        m.put("body", n.getBody());
        m.put("read", n.isRead());
        m.put("createdAt", n.getCreatedAt());
        if (n.getHref() != null) m.put("href", n.getHref());
        return m;
    }
}