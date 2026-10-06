package co.ke.pesabank.shared.util;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MoneyUtilsTest {

    @Test
    void scaleRoundsToTwoDecimalPlaces() {
        assertEquals(new BigDecimal("12.35"), MoneyUtils.scale(new BigDecimal("12.345")));
    }

    @Test
    void parseRemovesCurrencyFormatting() {
        assertEquals(new BigDecimal("1250.50"), MoneyUtils.parse("KES 1,250.50"));
    }

    @Test
    void parseInvalidInputReturnsZero() {
        assertEquals(new BigDecimal("0.00"), MoneyUtils.parse("not-a-number").setScale(2));
    }
}
