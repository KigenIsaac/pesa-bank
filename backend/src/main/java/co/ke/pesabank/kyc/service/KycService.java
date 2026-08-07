package co.ke.pesabank.kyc.service;

import co.ke.pesabank.kyc.domain.KycRecord;
import co.ke.pesabank.kyc.domain.KycStatus;
import co.ke.pesabank.kyc.repo.KycRepository;
import co.ke.pesabank.notification.domain.NotificationType;
import co.ke.pesabank.notification.service.NotificationService;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.shared.error.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class KycService {

    private final KycRepository repo;
    private final NotificationService notifications;

    @Transactional
    public KycRecord submit(User user, KycRecord incoming) {
        KycRecord existing = repo.findByUserId(user.getId()).orElse(null);

        if (existing != null && existing.getStatus() == KycStatus.APPROVED) {
            throw ApiException.badRequest("KYC_ALREADY_APPROVED", "Your KYC is already approved.");
        }
        if (existing != null && existing.getStatus() == KycStatus.PENDING) {
            throw ApiException.badRequest("KYC_UNDER_REVIEW", "Your KYC is already under review.");
        }

        KycRecord record = (existing != null) ? existing : new KycRecord();
        record.setUserId(user.getId());
        record.setStatus(KycStatus.PENDING);
        record.setSubmittedAt(Instant.now());
        record.setReviewedAt(null);
        record.setReviewedBy(null);
        record.setReviewerName(null);
        record.setRejectionReason(null);

        record.setFullName(incoming.getFullName());
        record.setDateOfBirth(incoming.getDateOfBirth());
        record.setGender(incoming.getGender());
        record.setMaritalStatus(incoming.getMaritalStatus());
        record.setNationality(incoming.getNationality());

        record.setIdType(incoming.getIdType());
        record.setIdNumber(incoming.getIdNumber());
        record.setIdIssueDate(incoming.getIdIssueDate());
        record.setIdExpiryDate(incoming.getIdExpiryDate());

        record.setKraPin(incoming.getKraPin() != null ? incoming.getKraPin().toUpperCase() : null);

        record.setPhysicalAddress(incoming.getPhysicalAddress());
        record.setTown(incoming.getTown());
        record.setCounty(incoming.getCounty());
        record.setPostalAddress(incoming.getPostalAddress());

        record.setEmploymentStatus(incoming.getEmploymentStatus());
        record.setEmployerName(incoming.getEmployerName());
        record.setOccupation(incoming.getOccupation());
        record.setMonthlyIncome(incoming.getMonthlyIncome());
        record.setSourceOfFunds(incoming.getSourceOfFunds());

        record.setAccountPurpose(incoming.getAccountPurpose());
        record.setAccountPurposeOther(incoming.getAccountPurposeOther());

        record.setNokName(incoming.getNokName());
        record.setNokRelationship(incoming.getNokRelationship());
        record.setNokPhone(incoming.getNokPhone());

        record.setPep(incoming.isPep());
        record.setPepDetails(incoming.getPepDetails());

        repo.save(record);
        notifications.notify(user.getId(), NotificationType.KYC,
                "KYC submitted", "Your KYC is now under review.", "/kyc/status");
        return record;
    }

    @Transactional
    public KycRecord approve(UUID id, User reviewer) {
        KycRecord kyc = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("KYC_NOT_FOUND", "KYC record not found."));
        if (kyc.getStatus() == KycStatus.APPROVED) {
            throw ApiException.badRequest("ALREADY_APPROVED", "This KYC is already approved.");
        }
        kyc.setStatus(KycStatus.APPROVED);
        kyc.setReviewedAt(Instant.now());
        kyc.setReviewedBy(reviewer.getId());
        kyc.setReviewerName(reviewer.getFullName());
        kyc.setRejectionReason(null);
        repo.save(kyc);

        notifications.notify(kyc.getUserId(), NotificationType.KYC,
                "KYC approved", "Your identity has been verified. You now have full access.",
                "/kyc/status");
        return kyc;
    }

    @Transactional
    public KycRecord reject(UUID id, String reason, User reviewer) {
        if (reason == null || reason.isBlank()) {
            throw ApiException.badRequest("REASON_REQUIRED", "A rejection reason is required.");
        }
        KycRecord kyc = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("KYC_NOT_FOUND", "KYC record not found."));

        kyc.setStatus(KycStatus.REJECTED);
        kyc.setReviewedAt(Instant.now());
        kyc.setReviewedBy(reviewer.getId());
        kyc.setReviewerName(reviewer.getFullName());
        kyc.setRejectionReason(reason.trim());
        repo.save(kyc);

        notifications.notify(kyc.getUserId(), NotificationType.KYC,
                "KYC not approved", reason.trim(), "/kyc/status");
        return kyc;
    }
}