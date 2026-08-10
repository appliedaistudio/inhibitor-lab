"""Shared benchmark metric helpers."""
import math

def wilson_interval(numerator, denominator, z=1.96):
    if not denominator:
        return None
    proportion = numerator / denominator
    z_squared = z * z
    center = (proportion + z_squared / (2 * denominator)) / (1 + z_squared / denominator)
    margin = z * math.sqrt((proportion * (1 - proportion) + z_squared / (4 * denominator)) / denominator)
    return {"lower": round(center - margin / (1 + z_squared / denominator), 4), "upper": round(center + margin / (1 + z_squared / denominator), 4), "confidence_level": 0.95, "method": "wilson"}

def rate(numerator, denominator, reason):
    metric = {"value": round(numerator / denominator, 4) if denominator else None, "numerator": numerator, "denominator": denominator}
    if denominator:
        metric["confidence_interval"] = wilson_interval(numerator, denominator)
    else:
        metric["reason"] = reason
    return metric
