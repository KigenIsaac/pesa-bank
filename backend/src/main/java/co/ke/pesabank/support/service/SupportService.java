package co.ke.pesabank.support.service;

import co.ke.pesabank.notification.domain.NotificationType;
import co.ke.pesabank.notification.service.NotificationService;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.shared.error.ApiException;
import co.ke.pesabank.shared.util.ReferenceGenerator;
import co.ke.pesabank.support.domain.Ticket;
import co.ke.pesabank.support.domain.TicketMessage;
import co.ke.pesabank.support.domain.TicketPriority;
import co.ke.pesabank.support.repo.TicketMessageRepository;
import co.ke.pesabank.support.repo.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupportService {

    private final TicketRepository tickets;
    private final TicketMessageRepository messages;
    private final ReferenceGenerator referenceGenerator;
    private final NotificationService notifications;

    @Transactional
    public Ticket create(User user, String subject, String category, TicketPriority priority, String message) {
        Ticket t = new Ticket();
        t.setReference(referenceGenerator.generate("TKT"));
        t.setUserId(user.getId());
        t.setSubject(subject);
        t.setCategory(category);
        t.setPriority(priority);
        tickets.save(t);

        TicketMessage m = new TicketMessage();
        m.setTicketId(t.getId());
        m.setAuthorId(user.getId());
        m.setAuthor(user.getFullName());
        m.setBody(message);
        m.setFromStaff(false);
        messages.save(m);

        notifications.notify(user.getId(), NotificationType.SUPPORT,
                "Support request created",
                "We received your request " + t.getReference() + ".",
                "/support");
        return t;
    }

    @Transactional
    public TicketMessage reply(User author, UUID ticketId, String body, boolean fromStaff) {
        Ticket t = tickets.findById(ticketId)
                .orElseThrow(() -> ApiException.notFound("TICKET_NOT_FOUND", "Ticket not found."));

        if (!fromStaff && !t.getUserId().equals(author.getId())) {
            throw ApiException.forbidden("NOT_YOUR_TICKET", "You don't have access to this ticket.");
        }

        TicketMessage m = new TicketMessage();
        m.setTicketId(ticketId);
        m.setAuthorId(author.getId());
        m.setAuthor(author.getFullName());
        m.setBody(body);
        m.setFromStaff(fromStaff);
        messages.save(m);

        if (t.getStatus() == co.ke.pesabank.support.domain.TicketStatus.RESOLVED
                || t.getStatus() == co.ke.pesabank.support.domain.TicketStatus.CLOSED) {
            t.setStatus(co.ke.pesabank.support.domain.TicketStatus.OPEN);
        }
        t.setUpdatedAt(java.time.Instant.now());
        tickets.save(t);

        if (fromStaff) {
            notifications.notify(t.getUserId(), NotificationType.SUPPORT,
                    "Reply on " + t.getReference(),
                    "Our team responded to your ticket.",
                    "/support");
        }
        return m;
    }
}