package co.ke.pesabank.kyc.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "kyc_records", uniqueConstraints = @UniqueConstraint(columnNames = "userId"))
@Getter
@Setter
public class KycRecord extends BaseEntity {

    @Column(nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private KycStatus status = KycStatus.PENDING;

    // Personal
    private String fullName;
    private LocalDate dateOfBirth;
    private String gender;
    private String maritalStatus;
    private String nationality;

    // Identity
    @Enumerated(EnumType.STRING)
    private IdType idType;
    private String idNumber;
    private LocalDate idIssueDate;
    private LocalDate idExpiryDate;

    // Tax
    private String kraPin;

    // Address
    private String physicalAddress;
    private String town;
    private String county;
    private String postalAddress;

    // Employment
    @Enumerated(EnumType.STRING)
    private EmploymentStatus employmentStatus;
    private String employerName;
    private String occupation;
    private String monthlyIncome;
    private String sourceOfFunds;

    // Purpose
    @Enumerated(EnumType.STRING)
    private AccountPurpose accountPurpose;
    private String accountPurposeOther;

    // Next of kin
    private String nokName;
    private String nokRelationship;
    private String nokPhone;

    // Declarations
    private boolean pep;
    @Column(length = 2000)
    private String pepDetails;

    // Review
    private Instant submittedAt = Instant.now();
    private Instant reviewedAt;
    private UUID reviewedBy;
    private String reviewerName;
    @Column(length = 2000)
    private String rejectionReason;
}