package co.ke.pesabank.customer.service;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.repo.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StatementService {

    private final TransactionRepository transactions;

    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
            .withZone(ZoneId.of("Africa/Nairobi"));

    public byte[] csv(Account account, Instant from, Instant to) {
        List<Transaction> list = transactions
                .findAllByAccountIdAndCreatedAtBetweenOrderByCreatedAtAsc(account.getId(), from, to);

        StringBuilder sb = new StringBuilder();
        sb.append("Reference,Date,Type,Description,Amount,Balance After,Status\n");
        for (Transaction tx : list) {
            sb.append(tx.getReference()).append(',')
              .append(DF.format(tx.getCreatedAt())).append(',')
              .append(tx.getType()).append(',')
              .append(escape(tx.getDescription())).append(',')
              .append(tx.getAmount().toPlainString()).append(',')
              .append(tx.getBalanceAfter().toPlainString()).append(',')
              .append(tx.getStatus()).append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] pdf(Account account, Instant from, Instant to) {
        // Lightweight PDF built manually so we don't pull a large dependency.
        List<Transaction> list = transactions
                .findAllByAccountIdAndCreatedAtBetweenOrderByCreatedAtAsc(account.getId(), from, to);

        StringBuilder content = new StringBuilder();
        content.append("BT /F1 16 Tf 50 780 Td (Pesa Bank - Account Statement) Tj ET\n");
        content.append("BT /F1 10 Tf 50 760 Td (Account: ").append(account.getAccountNumber())
                .append(") Tj ET\n");
        content.append("BT /F1 10 Tf 50 745 Td (From: ").append(DF.format(from))
                .append("  To: ").append(DF.format(to)).append(") Tj ET\n");

        int y = 715;
        for (Transaction tx : list) {
            if (y < 60) break;
            String line = String.format("%s  %-10s  %12s  %-40s",
                    DF.format(tx.getCreatedAt()),
                    tx.getType(),
                    tx.getAmount().toPlainString(),
                    truncate(tx.getDescription(), 40));
            content.append("BT /F1 9 Tf 50 ").append(y).append(" Td (")
                   .append(pdfEscape(line)).append(") Tj ET\n");
            y -= 14;
        }

        String obj1 = "<< /Type /Catalog /Pages 2 0 R >>";
        String obj2 = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
        String obj3 = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
                "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>";
        String obj4 = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
        byte[] stream = content.toString().getBytes(StandardCharsets.ISO_8859_1);
        String obj5 = "<< /Length " + stream.length + " >>\nstream\n" + content + "endstream";

        StringBuilder pdf = new StringBuilder();
        pdf.append("%PDF-1.4\n");
        int[] offsets = new int[6];
        offsets[1] = pdf.length(); pdf.append("1 0 obj\n").append(obj1).append("\nendobj\n");
        offsets[2] = pdf.length(); pdf.append("2 0 obj\n").append(obj2).append("\nendobj\n");
        offsets[3] = pdf.length(); pdf.append("3 0 obj\n").append(obj3).append("\nendobj\n");
        offsets[4] = pdf.length(); pdf.append("4 0 obj\n").append(obj4).append("\nendobj\n");
        offsets[5] = pdf.length(); pdf.append("5 0 obj\n").append(obj5).append("\nendobj\n");
        int xref = pdf.length();
        pdf.append("xref\n0 6\n0000000000 65535 f \n");
        for (int i = 1; i <= 5; i++) {
            pdf.append(String.format("%010d 00000 n \n", offsets[i]));
        }
        pdf.append("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n")
           .append(xref).append("\n%%EOF");

        return pdf.toString().getBytes(StandardCharsets.ISO_8859_1);
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace(",", " ");
    }

    private String truncate(String value, int len) {
        if (value == null) return "";
        return value.length() <= len ? value : value.substring(0, len - 1) + "…";
    }

    private String pdfEscape(String value) {
        return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }

    public static BigDecimal sum(List<Transaction> txs) {
        return txs.stream().map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}