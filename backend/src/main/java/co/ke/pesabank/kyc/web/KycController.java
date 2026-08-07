package co.ke.pesabank.kyc.web;

import co.ke.pesabank.kyc.domain.*;
import co.ke.pesabank.kyc.repo.KycRepository;
import co.ke.pesabank.kyc.service.KycService;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/kyc")
@RequiredArgsConstructor
public class KycController {

    private final KycService service;
    private final KycRepository repo;
    private final AuditService audit;

    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submit(@Valid @RequestBody KycSubmitRequest req) {
        User user = CurrentUser.get();

        KycRecord record = new KycRecord();
        record.setFullName(req.fullName());
        record.setDateOfBirth(req.dateOfBirth());
        record.setGender(req.gender());
        record.setMaritalStatus(req.maritalStatus());
        record.setNationality(req.nationality());
        record.setIdType(req.idType());
        record.setIdNumber(req.idNumber());
        record.setIdIssueDate(req.idIssueDate());
        record.setIdExpiryDate(req.idExpiryDate());
        record.setKraPin(req.kraPin());
        record.setPhysicalAddress(req.physicalAddress());
        record.setTown(req.town());
        record.setCounty(req.county());
        record.setPostalAddress(req.postalAddress());
        record.setEmploymentStatus(req.employmentStatus());
        record.setEmployerName(req.employerName());
        record.setOccupation(req.occupation());
        record.setMonthlyIncome(req.monthlyIncome());
        record.setSourceOfFunds(req.sourceOfFunds());
        record.setAccountPurpose(req.accountPurpose());
        record.setAccountPurposeOther(req.accountPurposeOther());
        record.setNokName(req.nokName());
        record.setNokRelationship(req.nokRelationship());
        record.setNokPhone(req.nokPhone());
        record.setPep(req.isPep());
        record.setPepDetails(req.pepDetails());

        KycRecord saved = service.submit(user, record);
        audit.record(user, "KYC_SUBMITTED", user.getEmail(), "Submitted for review");

        return ResponseEntity.ok(Map.of(
                "status", saved.getStatus().name(),
                "submittedAt", saved.getSubmittedAt()));
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        User user = CurrentUser.get();
        KycRecord record = repo.findByUserId(user.getId()).orElse(null);

        Map<String, Object> body = new HashMap<>();
        if (record == null) {
            body.put("status", "NOT_STARTED");
            return body;
        }

        body.put("status", record.getStatus().name());
        body.put("submittedAt", record.getSubmittedAt());
        if (record.getReviewedAt() != null) body.put("reviewedAt", record.getReviewedAt());
        if (record.getReviewerName() != null) body.put("reviewedBy", record.getReviewerName());
        if (record.getRejectionReason() != null) body.put("rejectionReason", record.getRejectionReason());

        Map<String, Object> summary = new HashMap<>();
        summary.put("fullName", record.getFullName());
        summary.put("idType", record.getIdType() != null ? record.getIdType().name() : null);
        summary.put("idNumber", record.getIdNumber());
        summary.put("kraPin", record.getKraPin());
        summary.put("county", record.getCounty());
        summary.put("accountPurpose", record.getAccountPurpose() != null ? record.getAccountPurpose().name() : null);
        body.put("summary", summary);

        return body;
    }

    public record KycSubmitRequest(
            @NotBlank String fullName,
            @NotNull LocalDate dateOfBirth,
            String gender,
            String maritalStatus,
            String nationality,
            @NotNull IdType idType,
            @NotBlank String idNumber,
            LocalDate idIssueDate,
            LocalDate idExpiryDate,
            @NotBlank String kraPin,
            @NotBlank String physicalAddress,
            @NotBlank String town,
            @NotBlank String county,
            String postalAddress,
            @NotNull EmploymentStatus employmentStatus,
            String employerName,
            @NotBlank String occupation,
            String monthlyIncome,
            String sourceOfFunds,
            @NotNull AccountPurpose accountPurpose,
            String accountPurposeOther,
            @NotBlank String nokName,
            @NotBlank String nokRelationship,
            @NotBlank String nokPhone,
            boolean isPep,
            String pepDetails) {}
}