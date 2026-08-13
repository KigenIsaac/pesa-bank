package co.ke.pesabank.support.web;

import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.error.ApiException;
import co.ke.pesabank.support.domain.Ticket;
import co.ke.pesabank.support.domain.TicketMessage;
import co.ke.pesabank.support.domain.TicketPriority;
import co.ke.pesabank.support.repo.TicketMessageRepository;
import co.ke.pesabank.support.repo.TicketRepository;
import co.ke.pesabank.support.service.SupportService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService service;
    private final TicketRepository tickets;
    private final TicketMessageRepository messages;

    @GetMapping("/tickets")
    public List<Map<String, Object>> list() {
        User user = CurrentUser.get();
        return tickets.findAllByUserIdOrderByUpdatedAtDescCreatedAtDesc(user.getId())
                .stream().map(this::ticketDto).toList();
    }

    @PostMapping("/tickets")
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CreateTicketRequest req) {
        User user = CurrentUser.get();
        Ticket t = service.create(user, req.subject(), req.category(),
                req.priority() != null ? req.priority() : TicketPriority.NORMAL,
                req.message());
        return ResponseEntity.ok(ticketDto(t));
    }

    @PostMapping("/tickets/{id}/messages")
    public ResponseEntity<Map<String, Object>> reply(@PathVariable UUID id,
                                                     @Valid @RequestBody ReplyRequest req) {
        User user = CurrentUser.get();
        Ticket t = tickets.findById(id)
                .orElseThrow(() -> ApiException.notFound("TICKET_NOT_FOUND", "Ticket not found."));
        if (!t.getUserId().equals(user.getId())) {
            throw ApiException.forbidden("NOT_YOUR_TICKET", "You don't have access to this ticket.");
        }
        TicketMessage m = service.reply(user, id, req.body(), false);
        return ResponseEntity.ok(messageDto(m));
    }

    private Map<String, Object> ticketDto(Ticket t) {
        List<Map<String, Object>> msgs = new ArrayList<>();
        for (TicketMessage m : messages.findAllByTicketIdOrderByCreatedAtAsc(t.getId())) {
            msgs.add(messageDto(m));
        }
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", t.getId());
        dto.put("reference", t.getReference());
        dto.put("subject", t.getSubject());
        dto.put("category", t.getCategory());
        dto.put("priority", t.getPriority().name());
        dto.put("status", t.getStatus().name());
        dto.put("createdAt", t.getCreatedAt());
        dto.put("updatedAt", t.getUpdatedAt() != null ? t.getUpdatedAt() : t.getCreatedAt());
        dto.put("messages", msgs);
        return dto;
    }

    private Map<String, Object> messageDto(TicketMessage m) {
        return Map.of(
                "id", m.getId(),
                "author", m.getAuthor(),
                "body", m.getBody(),
                "createdAt", m.getCreatedAt(),
                "fromStaff", m.isFromStaff());
    }

    public record CreateTicketRequest(
            @NotBlank String subject,
            @NotBlank String category,
            TicketPriority priority,
            @NotBlank String message) {}

    public record ReplyRequest(@NotBlank String body) {}
}