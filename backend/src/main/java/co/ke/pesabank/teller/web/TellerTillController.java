package co.ke.pesabank.teller.web;

import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.util.MoneyUtils;
import co.ke.pesabank.teller.domain.Till;
import co.ke.pesabank.teller.service.TillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/teller/till")
@RequiredArgsConstructor
public class TellerTillController {

    private final TillService service;

    @GetMapping
    public Map<String, Object> get() {
        User teller = CurrentUser.get();
        Till till = service.current(teller.getId());

        Map<String, Object> body = new HashMap<>();
        if (till == null) {
            body.put("isOpen", false);
            body.put("currency", "KES");
            body.put("currentBalance", BigDecimal.ZERO);
            return body;
        }

        body.put("isOpen", till.isOpen());
        body.put("openedAt", till.getOpenedAt());
        body.put("openingBalance", till.getOpeningBalance());
        body.put("currentBalance", expected(till));
        body.put("currency", "KES");
        return body;
    }

    @PostMapping("/open")
    public Map<String, Object> open(@RequestBody OpenRequest req) {
        User teller = CurrentUser.get();
        Till till = service.open(teller.getId(), MoneyUtils.scale(req.openingBalance()));

        Map<String, Object> body = new HashMap<>();
        body.put("isOpen", true);
        body.put("openedAt", till.getOpenedAt());
        body.put("openingBalance", till.getOpeningBalance());
        body.put("currentBalance", till.getOpeningBalance());
        body.put("currency", "KES");
        return body;
    }

    @PostMapping("/close")
    public ResponseEntity<Map<String, Object>> close() {
        User teller = CurrentUser.get();
        Till till = service.close(teller.getId());
        return ResponseEntity.ok(Map.of(
                "isOpen", false,
                "closedAt", till.getClosedAt(),
                "expectedCash", till.getExpectedCash()));
    }

    private BigDecimal expected(Till till) {
        BigDecimal opening = till.getOpeningBalance() == null ? BigDecimal.ZERO : till.getOpeningBalance();
        BigDecimal dep = till.getDeposits() == null ? BigDecimal.ZERO : till.getDeposits();
        BigDecimal wd = till.getWithdrawals() == null ? BigDecimal.ZERO : till.getWithdrawals();
        return opening.add(dep).subtract(wd);
    }

    public record OpenRequest(BigDecimal openingBalance) {}
}