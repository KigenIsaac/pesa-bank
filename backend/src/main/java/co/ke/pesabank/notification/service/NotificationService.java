package co.ke.pesabank.notification.service;

import co.ke.pesabank.notification.domain.Notification;
import co.ke.pesabank.notification.domain.NotificationType;
import co.ke.pesabank.notification.repo.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repo;

    public void notify(UUID userId, NotificationType type, String title, String body, String href) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title);
        n.setBody(body);
        n.setHref(href);
        repo.save(n);
    }
}