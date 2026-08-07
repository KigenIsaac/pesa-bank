package co.ke.pesabank.shared.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class MoneyUtils {

    private MoneyUtils() {}

    public static BigDecimal scale(BigDecimal value) {
        if (value == null) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal parse(String raw) {
        if (raw == null) return BigDecimal.ZERO;
        String cleaned = raw.replaceAll("[^0-9.]", "");
        if (cleaned.isEmpty()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(cleaned).setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException ex) {
            return BigDecimal.ZERO;
        }
    }
}