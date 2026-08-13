package co.ke.pesabank.notification.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "notifications", indexes = @Index(name = "idx_notif_user", columnList = "userId"))
@Getter
@Setter
public class Notification extends BaseEntity {

    @Column(nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000, nullable = false)
    private String body;

    private String href;

    @Column(nullable = false)
    private boolean read = false;
}