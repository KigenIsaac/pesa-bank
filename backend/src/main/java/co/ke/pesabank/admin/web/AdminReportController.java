package co.ke.pesabank.admin.web;

import co.ke.pesabank.admin.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final ReportService reports;

    @GetMapping("/{reportId}")
    public ResponseEntity<byte[]> download(
            @PathVariable String reportId,
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(name = "from", required = false) String fromStr,
            @RequestParam(name = "to", required = false) String toStr) {

        ZoneId nairobi = ZoneId.of("Africa/Nairobi");
        Instant from = (fromStr != null ? LocalDate.parse(fromStr)
                : LocalDate.now(nairobi).minusDays(7))
                .atStartOfDay(nairobi).toInstant();
        Instant to = (toStr != null ? LocalDate.parse(toStr).plusDays(1)
                : LocalDate.now(nairobi).plusDays(1))
                .atStartOfDay(nairobi).toInstant();

        byte[] body = reports.generate(reportId, format, from, to);
        String filename = reportId + "-" + fromStr + "-to-" + toStr + "." + format;

        return ResponseEntity.ok()
                .contentType("csv".equalsIgnoreCase(format)
                        ? MediaType.parseMediaType("text/csv")
                        : MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(body);
    }
}