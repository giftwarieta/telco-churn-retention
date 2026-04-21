class ChurnROI:
    def __init__(
        self,
        avg_clv=2000,
        retention_cost=100,
        success_rate=0.3,
        total_customers=None,
        churn_rate=None,
        avg_arpu=None,
    ):
        """
        Calculates retention impact using CLV-based revenue assumptions.

        The extra fields keep compatibility with the FastAPI ROI routes while
        preserving the older Streamlit-style estimate_impact() interface.
        """
        self.avg_clv = avg_clv
        self.retention_cost = retention_cost
        self.success_rate = success_rate
        self.total_customers = total_customers
        self.churn_rate = churn_rate
        self.avg_arpu = avg_arpu

    def estimate_impact(self, num_at_risk):
        """
        Estimates the net profit, revenue saved, and total cost for a group of at-risk customers.
        """
        potential_revenue_saved = num_at_risk * self.avg_clv * self.success_rate
        total_campaign_cost = num_at_risk * self.retention_cost
        net_roi = potential_revenue_saved - total_campaign_cost

        return net_roi, potential_revenue_saved, total_campaign_cost

    def calculate(self):
        """
        Returns the ROI payload expected by the web app APIs.
        """
        churning_customers = round((self.total_customers or 0) * (self.churn_rate or 0))
        revenue_at_risk = churning_customers * self.avg_clv
        total_retention_cost = churning_customers * self.retention_cost
        saved_customers = round(churning_customers * self.success_rate)
        revenue_recovered = saved_customers * self.avg_clv
        clv_saved = saved_customers * self.avg_clv
        net_roi = revenue_recovered - total_retention_cost
        roi_percent = (net_roi / total_retention_cost * 100) if total_retention_cost > 0 else 0
        payback_months = (total_retention_cost / (revenue_recovered / 12)) if revenue_recovered > 0 else 0

        return {
            "churning_customers": int(churning_customers),
            "revenue_at_risk": round(float(revenue_at_risk), 2),
            "total_retention_cost": round(float(total_retention_cost), 2),
            "saved_customers": int(saved_customers),
            "revenue_recovered": round(float(revenue_recovered), 2),
            "clv_saved": round(float(clv_saved), 2),
            "net_roi": round(float(net_roi), 2),
            "roi_percent": round(float(roi_percent), 2),
            "payback_months": round(float(payback_months), 2),
        }
