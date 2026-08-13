package co.ke.pesabank.admin.service;

import co.ke.pesabank.admin.domain.ComplianceAlert;
import co.ke.pesabank.admin.repo.ComplianceAlertRepository;
import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.repo.TransactionRepository;
import co.ke.pesabank.kyc.domain.KycRecord;
import co.ke.pesabank.kyc.repo.KycRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ComplianceService {

    private final ComplianceAlertRepository alerts;
    private final TransactionRepository transactions;
    private final KycRepository kyc;

    /**
     * Generates alerts on the fly from data we already have, then merges with stored ones.
     * Real AML systems do this in a scheduled job.
     */
    public List<ComplianceAlert> list() {
        List<ComplianceAlert> computed = new ArrayList<>();

        // Large single-transaction alerts
        BigDecimal threshold = new BigDecimal("1000000");
        for (Transaction t : transactions.findAll()) {
            if (t.getAmount().compareTo(threshold) >= 0) {
                ComplianceAlert a = new ComplianceAlert();
                a.setType(ComplianceAlert.AlertType.AML);
                a.setSeverity(t.getAmount().compareTo(new BigDecimal("5000000")) >= 0
                        ? ComplianceAlert.Severity.HIGH : ComplianceAlert.Severity.MEDIUM);
                a.setTitle("High-value transaction");
                a.setDetail("Transaction " + t.getReference() + " of KES " + t.getAmount());
                a.setRelatedTransactionId(t.getId());
                a.setStatus(ComplianceAlert.AlertStatus.OPEN);
                computed.add(a);
            }
        }

        // PEP alerts
        for (KycRecord k : kyc.findAll()) {
            if (k.isPep()) {
                ComplianceAlert a = new ComplianceAlert();
                a.setType(ComplianceAlert.AlertType.PEP);
                a.setSeverity(ComplianceAlert.Severity.HIGH);
                a.setTitle("PEP declaration");
                a.setDetail(k.getFullName() + " — " + (k.getPepDetails() != null ? k.getPepDetails() : "no details"));
                a.setRelatedUserId(k.getUserId());
                a.setStatus(ComplianceAlert.AlertStatus.OPEN);
                computed.add(a);
            }
        }

        List<ComplianceAlert> stored = alerts.findAllByOrderByCreatedAtDesc();
        List<ComplianceAlert> all = new ArrayList<>(stored);
        all.addAll(computed);
        return all;
    }
}