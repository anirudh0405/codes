import React from 'react';
import { Apple, Moon, Stethoscope } from 'lucide-react';

export function InsightsSection() {
  const insights = [
    {
      id: 'activity',
      title: 'Stay Physically Active',
      desc: 'Regular, moderate physical activity supports vascular tone and cardiovascular endurance.',
      iconColor: '#10B981',
      iconBg: '#ECFDF3',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Running person silhouette */}
          <circle cx="17" cy="4" r="2" />
          <path d="m15 8-3.5 4-3-1.5L5 14" />
          <path d="M11 12l2.5 3 4-2" />
          <path d="m8 16.5-1.5 4.5" />
          <path d="m13.5 15 2.5 6" />
        </svg>
      ),
    },
    {
      id: 'diet',
      title: 'Maintain a Balanced Diet',
      desc: 'Nutrient-rich, fiber-focused foods support healthy lipid profiles and arterial elasticity.',
      iconColor: '#F59E0B',
      iconBg: '#FFFBEB',
      icon: <Apple style={{ width: 18, height: 18, color: '#F59E0B' }} />,
    },
    {
      id: 'stress',
      title: 'Manage Stress & Sleep',
      desc: 'Restorative sleep and autonomic recovery help maintain balanced heart rate variability.',
      iconColor: '#6366F1',
      iconBg: '#EEF2FF',
      icon: <Moon style={{ width: 18, height: 18, color: '#6366F1' }} />,
    },
    {
      id: 'checkup',
      title: 'Regular Check-ups',
      desc: 'Discuss concerning or evolving results with a qualified healthcare physician or cardiologist.',
      iconColor: '#3B82F6',
      iconBg: '#EFF6FF',
      icon: <Stethoscope style={{ width: 18, height: 18, color: '#3B82F6' }} />,
    },
  ];

  return (
    <section className="overview-insights-section" aria-label="Personalized Wellness Insights">
      {/* Header: GENERAL GUIDANCE */}
      <div className="overview-section-header-compact">
        <h4 className="overview-section-eyebrow">
          GENERAL GUIDANCE
        </h4>
        <span className="overview-section-subtext">
          Personalized Wellness Insights
        </span>
      </div>

      {/* 2×2 Grid of Cards */}
      <div className="overview-insights-grid">
        {insights.map((item) => (
          <div key={item.id} className="overview-card overview-insight-card" id={`insight-card-${item.id}`}>
            <div className="overview-insight-card-top">
              <div
                className="overview-insight-icon-container"
                style={{ backgroundColor: item.iconBg }}
              >
                {item.icon}
              </div>
              <h5 className="overview-insight-title">{item.title}</h5>
            </div>
            <p className="overview-insight-desc">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
