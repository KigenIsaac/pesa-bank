package co.ke.pesabank.kyc.web;

import co.ke.pesabank.kyc.domain.*;
import co.ke.pesabank.kyc.repo.KycRepository;
import co.ke.pesabank.kyc.service.KycService;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.repo.UserRepository;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import co.ke.pesabank.shared.error.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/kyc")
@RequiredArgsConstructor
public class AdminKycController {

    private final KycRepository repo;
    private final KycService service;
    private final AuditService audit;
    private final UserRepository users;

    @GetMapping
    public List<KycDto> list() {
        return repo.findAllByOrderBySubmittedAtDesc().stream().map(KycDto::from).toList();
    }

    @GetMapping("/{id}")
    public KycDto get(@PathVariable UUID id) {
        KycRecord kyc = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("KYC_NOT_FOUND", "KYC record not found."));
        return KycDto.from(kyc);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Map<String, Object>> approve(@PathVariable UUID id) {
        User reviewer = CurrentUser.get();
        KycRecord kyc = service.approve(id, reviewer);
        audit.record(reviewer, "KYC_APPROVED", id.toString(), "Approved");
        return ResponseEntity.ok(Map.of("status", kyc.getStatus().name()));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Map<String, Object>> reject(
            @PathVariable UUID id,
            @Valid @RequestBody RejectRequest req) {
        User reviewer = CurrentUser.get();
        KycRecord kyc = service.reject(id, req.reason(), reviewer);
        audit.record(reviewer, "KYC_REJECTED", id.toString(), req.reason());
        return ResponseEntity.ok(Map.of("status", kyc.getStatus().name()));
    }

    public record RejectRequest(@NotBlank String reason) {}

    public record KycDto(
            UUID id, String status, String customerName, String email, String phone,
            String idType, String idNumber, String kraPin,
            java.time.Instant submittedAt, java.time.Instant reviewedAt,
            String rejectionReason, boolean pep, String pepDetails,
            String fullName, java.time.LocalDate dateOfBirth, String gender,
            String maritalStatus, String nationality,
            java.time.LocalDate idIssueDate, java.time.LocalDate idExpiryDate,
            String physicalAddress, String town, String county, String postalAddress,
            String employmentStatus, String employerName, String occupation,
            String monthlyIncome, String sourceOfFunds,
            String accountPurpose, String accountPurposeOther,
            String nokName, String nokRelationship, String nokPhone) {

        static KycDto from(KycRecord k) {
            return new KycDto(
                    k.getId(),
                    k.getStatus().name(),
                    k.getFullName(),
                    null,
                    k.getIdType() != null ? k.getIdType().name() : null,
                    k.getIdNumber(),
                    k.getKraPin(),
                    k.getSubmittedAt(),
                    k.getReviewedAt(),
                    k.getRejectionReason(),
                    k.isPep(),
                    k.getPepDetails(),
                    k.getFullName(),
                    k.getDateOfBirth(),
                    k.getGender(),
                    k.getMaritalStatus(),
                    k.getNationality(),
                    k.getIdIssueDate(),
                    k.getIdExpiryDate(),
                    k.getPhysicalAddress(),
                    k.getTown(),
                    k.getCounty(),
                    k.getPostalAddress(),
                    k.getEmploymentStatus() != null ? k.getEmploymentStatus().name() : null,
                    k.getEmployerName(),
                    k.getOccupation(),
                    k.getMonthlyIncome(),
                    k.getSourceOfFunds(),
                    k.getAccountPurpose() != null ? k.getAccountPurpose().name() : null,
                    k.getAccountPurposeOther(),
                    k.getNokName(),
                    k.getNokRelationship(),
                    k.getNokPhone());
        }
    }
}