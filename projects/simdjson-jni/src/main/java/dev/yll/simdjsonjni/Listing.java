package dev.yll.simdjsonjni;

public record Listing(
    String make,
    String model,
    int year,
    int city08,
    int highway08,
    int comb08,
    double co2TailpipeGpm,
    String fuelType) {

  public static final int MIN_MODEL_YEAR = 1984;
  public static final int MAX_MODEL_YEAR = 2030;

  public boolean isValid() {
    return year >= MIN_MODEL_YEAR
        && year <= MAX_MODEL_YEAR
        && city08 > 0
        && highway08 > 0
        && comb08 > 0
        && co2TailpipeGpm >= 0.0
        && !make.isEmpty()
        && !model.isEmpty()
        && !fuelType.isEmpty();
  }
}
