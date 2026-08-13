package co.ke.pesabank.admin.web;

import co.ke.pesabank.admin.domain.BankSettings;
import co.ke.pesabank.admin.repo.BankSettingsRepository;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
public class AdminSettingsController {

    private final BankSettingsRepository repo;
    private final AuditService audit;

    @GetMapping
    public BankSettings get() {
        return repo.findAll().stream().findFirst().orElseGet(() -> repo.save(new BankSettings()));
    }

    @PutMapping
    public ResponseEntity<BankSettings> update(@RequestBody BankSettingsUpdate req) {
        User admin = CurrentUser.get();
        BankSettings settings = repo.findAll().stream().findFirst().orElseGet(BankSettings::new);

        if (req.bankName() != null) settings.setBankName(req.bankName());
        if (req.supportEmail() != null) settings.setSupportEmail(req.supportEmail());
        if (req.supportPhone() != null) settings.setSupportPhone(req.supportPhone());
        if (req.minPasswordLength() != null) settings.setMinPasswordLength(req.minPasswordLength());
        if (req.sessionTimeoutMinutes() != null) settings.setSessionTimeoutMinutes(req.sessionTimeoutMinutes());
        if (req.enforce2FAForStaff() != null) settings.setEnforce2FAForStaff(req.enforce2FAForStaff());
        if (req.dailyTransferLimit() != null) settings.setDailyTransferLimit(req.dailyTransferLimit());
        if (req.maxCashWithdrawal() != null) settings.setMaxCashWithdrawal(req.maxCashWithdrawal());
        if (req.maintenanceMode() != null) settings.setMaintenanceMode(req.maintenanceMode());

        repo.save(settings);
        audit.record(admin, "SETTINGS_UPDATED", "bank", null);
        return ResponseEntity.ok(settings);
    }

    public record BankSettingsUpdate(
            String bankName,
            String supportEmail,
            String supportPhone,
            Integer minPasswordLength,
            Integer sessionTimeoutMinutes,
            Boolean enforce2FAForStaff,
            BigDecimal dailyTransferLimit,
            BigDecimal maxCashWithdrawal,
            Boolean maintenanceMode) {}
}