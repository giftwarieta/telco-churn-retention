class ChurnROI:
    def __init__(self, avg_clv=2000, retention_cost=100, success_rate=0.3):
        """
        Calculates the financial impact of retention based on Lifetime Value.
        
        :param avg_clv: Average Customer Lifetime Value ($)
        :param retention_cost: Cost to offer a retention incentive ($)
        :param success_rate: Probability that the offer is accepted (0.0 to 1.0)
        """
        self.avg_clv = avg_clv
        self.retention_cost = retention_cost
        self.success_rate = success_rate

    def estimate_impact(self, num_at_risk):
        """
        Estimates the net profit, revenue saved, and total cost for a group of at-risk customers.
        """
        # Potential revenue saved = (Total CLV of targets) * Success Rate
        potential_revenue_saved = num_at_risk * self.avg_clv * self.success_rate
        
        # Total cost = (Total targets) * Cost of the offer
        total_campaign_cost = num_at_risk * self.retention_cost
        
        # Net ROI = Revenue saved - Cost of campaign
        net_roi = potential_revenue_saved - total_campaign_cost
        
        return net_roi, potential_revenue_saved, total_campaign_cost