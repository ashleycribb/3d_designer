import math
from typing import List, Dict, Any

class DDCSimulationService:
    @staticmethod
    def run_thermal_pid_step(
        room_temp: float,
        setpoint: float,
        current_damper_pct: float,
        time_step_sec: float = 1.0
    ) -> Dict[str, Any]:
        """
        Calculates 1 step of PID closed-loop DDC logic for room cooling/heating.
        """
        error = room_temp - setpoint

        # Simple proportional + integral damper controller
        kp = 8.0
        ki = 0.5

        target_damper = max(10.0, min(100.0, current_damper_pct + (kp * error * (time_step_sec / 10.0))))

        # Room temperature thermal response (cooling air at 55 deg F)
        cooling_power = (target_damper / 100.0) * 0.15
        ambient_heat_gain = 0.02

        new_room_temp = room_temp - cooling_power + ambient_heat_gain

        return {
            "room_temperature_f": round(new_room_temp, 2),
            "setpoint_f": setpoint,
            "vav_damper_percent": round(target_damper, 1),
            "vav_airflow_cfm": round((target_damper / 100.0) * 500.0, 0),
            "ahu_fan_speed_hz": round(30.0 + (target_damper / 100.0) * 30.0, 1),
            "status_flag": "COOLING" if target_damper > 30 else "IDLE"
        }

ddc_simulation_service = DDCSimulationService()
