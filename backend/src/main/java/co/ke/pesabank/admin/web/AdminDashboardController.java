package co.ke.pesabank.admin.web;

import co.ke.pesabank.admin.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService service;

    @GetMapping("/stats")
    public Map<String, Object> stats() { return service.stats(); }

    @GetMapping("/activity")
    public List<Map<String, Object>> activity() { return service.activity(); }
}