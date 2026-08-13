package co.ke.pesabank.teller.web;

import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import co.ke.pesabank.shared.util.MoneyUtils;
import co.ke.pesabank.teller.domain.EodReport;
import co.ke.pesabank.teller.service.EodService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/teller/eod")
@RequiredArgsConstructor
public class TellerEodController {

    private final EodService service;
    private final AuditService audit;

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        return service.summary(CurrentUser.get());
    }

    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submit(@RequestBody SubmitRequest req) {
        User teller = CurrentUser.get();
        EodReport report = service.submit(teller, MoneyUtils.scale(req.countedCash()), req.note());
        audit.record(teller, "EOD_SUBMITTED", teller.getEmail(),
                "Counted " + report.getCountedCash() + ", variance " + report.getVariance());
        return ResponseEntity.ok(Map.of(
                "submitted", true,
                "variance", report.getVariance()));
    }

    public record SubmitRequest(BigDecimal countedCash, String note) {}
}