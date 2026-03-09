import type { Round, LeaderboardEntry } from '../types';

export const mockRounds: Round[] = [
    {
        id: 'round-1',
        title: 'Customer Retention Investigation',
        description: 'Investigate reasons for returning customers dropping off.',
        objective: 'Identify the key drivers of churn and propose a retention strategy.',
        caseBrief: 'The company has noticed a sudden 15% drop in returning customers over the past quarter. The executive team has asked you to analyze the recent cohort data to find the root cause.',
        datasetTitle: 'Q3_Customer_Cohorts_Data.csv',
        datasetDescription: 'Contains customer IDs, signup dates, last login dates, total spend, and engagement scores.',
        documentation: [
            {
                sectionTitle: 'Case Overview',
                content: 'Focus your analysis on the last 3 months. A returning customer is defined as someone who has made more than one purchase.',
            },
            {
                sectionTitle: 'Dataset Description',
                content: 'Engagement score ranges from 1-100. A score below 40 indicates high risk of churn.',
            }
        ],
        questions: [
            {
                id: 'q1-1',
                roundId: 'round-1',
                questionIndex: 0,
                text: 'What was the average engagement score for customers who churned in Q3?',
                options: [
                    { id: 'opt1', text: '32.5' },
                    { id: 'opt2', text: '45.0' },
                    { id: 'opt3', text: '28.4' },
                    { id: 'opt4', text: '18.9' }
                ],
                correctOptionId: 'opt1'
            },
            {
                id: 'q1-2',
                roundId: 'round-1',
                questionIndex: 1,
                text: 'Which demographic segment showed the highest drop-off rate?',
                options: [
                    { id: 'opt1', text: 'Gen Z' },
                    { id: 'opt2', text: 'Millennials' },
                    { id: 'opt3', text: 'Gen X' },
                    { id: 'opt4', text: 'Baby Boomers' }
                ],
                correctOptionId: 'opt2'
            },
            {
                id: 'q1-3',
                roundId: 'round-1',
                questionIndex: 2,
                text: 'What is the most common reason cited in the feedback survey for leaving?',
                options: [
                    { id: 'opt1', text: 'Price' },
                    { id: 'opt2', text: 'Customer Service' },
                    { id: 'opt3', text: 'Product Quality' },
                    { id: 'opt4', text: 'Shipping Delays' }
                ],
                correctOptionId: 'opt4'
            },
            {
                id: 'q1-4',
                roundId: 'round-1',
                questionIndex: 3,
                text: 'Based on the data, what retention strategy would be most effective?',
                options: [
                    { id: 'opt1', text: 'Discount Codes' },
                    { id: 'opt2', text: 'Free Upgraded Shipping' },
                    { id: 'opt3', text: 'Loyalty Points' },
                    { id: 'opt4', text: 'Exclusive Events' }
                ],
                correctOptionId: 'opt2' // matching the shipping delay issue
            }
        ]
    },
    {
        id: 'round-2',
        title: 'Marketing Campaign Investigation',
        description: 'Determine which marketing channels are underperforming.',
        objective: 'Identify weak-performing channels and ROI patterns.',
        caseBrief: 'Our Q2 marketing spend was the highest ever, but overall sales remained flat. You need to investigate our channel performance data to find where the budget is being wasted.',
        datasetTitle: 'Q2_Marketing_Spend_ROI.xlsx',
        datasetDescription: 'Contains daily spend, impressions, clicks, conversions, and revenue by channel.',
        documentation: [
            {
                sectionTitle: 'Business Context',
                content: 'We heavily invested in Social Media and Paid Search. Email marketing remained consistent with Q1.',
            },
            {
                sectionTitle: 'Assumptions',
                content: 'Assume a 14-day attribution window for all conversions.',
            }
        ],
        questions: [
            {
                id: 'q2-1',
                roundId: 'round-2',
                questionIndex: 0,
                text: 'Which channel had the lowest Return on Ad Spend (ROAS)?',
                options: [
                    { id: 'opt1', text: 'Paid Search' },
                    { id: 'opt2', text: 'Social Media' },
                    { id: 'opt3', text: 'Email' },
                    { id: 'opt4', text: 'Affiliates' }
                ],
                correctOptionId: 'opt2'
            },
            {
                id: 'q2-2',
                roundId: 'round-2',
                questionIndex: 1,
                text: 'What was the Cost Per Acquisition (CPA) for Paid Search?',
                options: [
                    { id: 'opt1', text: '$15.50' },
                    { id: 'opt2', text: '$22.30' },
                    { id: 'opt3', text: '$45.00' },
                    { id: 'opt4', text: '$8.90' }
                ],
                correctOptionId: 'opt3'
            },
            {
                id: 'q2-3',
                roundId: 'round-2',
                questionIndex: 2,
                text: 'Which week saw the largest spike in impressions without matching conversions?',
                options: [
                    { id: 'opt1', text: 'Week 2' },
                    { id: 'opt2', text: 'Week 5' },
                    { id: 'opt3', text: 'Week 8' },
                    { id: 'opt4', text: 'Week 11' }
                ],
                correctOptionId: 'opt2'
            },
            {
                id: 'q2-4',
                roundId: 'round-2',
                questionIndex: 3,
                text: 'If budget is shifted away from the lowest ROAS channel, where should it go?',
                options: [
                    { id: 'opt1', text: 'To Email, which has the highest ROI.' },
                    { id: 'opt2', text: 'To Paid Search, to capture more intent.' },
                    { id: 'opt3', text: 'To TV Ads.' },
                    { id: 'opt4', text: 'Save the budget.' }
                ],
                correctOptionId: 'opt1'
            }
        ]
    },
    {
        id: 'round-3',
        title: 'Sales Forecasting Investigation',
        description: 'Provide recommendations for next quarter planning based on trends.',
        objective: 'Forecast Q4 sales and identify the highest growth category.',
        caseBrief: 'The leadership team needs a reliable forecast for Q4 to manage inventory. Review the historical sales data and seasonal trends to provide actionable strategic advice.',
        datasetTitle: 'Historical_Sales_2020_2024.csv',
        datasetDescription: 'Contains monthly sales data broken down by product category and region.',
        documentation: [
            {
                sectionTitle: 'Case Overview',
                content: 'Q4 is our busiest season. Note the impact of historical supply chain disruptions in 2021.',
            },
            {
                sectionTitle: 'Tips',
                content: 'Use a moving average to smooth out anomalies. Pay special attention to Category B.',
            }
        ],
        questions: [
            {
                id: 'q3-1',
                roundId: 'round-3',
                questionIndex: 0,
                text: 'Based on the 3-year moving average, what is the expected revenue for Q4?',
                options: [
                    { id: 'opt1', text: '$1.2M' },
                    { id: 'opt2', text: '$1.5M' },
                    { id: 'opt3', text: '$1.8M' },
                    { id: 'opt4', text: '$2.1M' }
                ],
                correctOptionId: 'opt3'
            },
            {
                id: 'q3-2',
                roundId: 'round-3',
                questionIndex: 1,
                text: 'Which product category shows the most consistent year-over-year growth?',
                options: [
                    { id: 'opt1', text: 'Category A' },
                    { id: 'opt2', text: 'Category B' },
                    { id: 'opt3', text: 'Category C' },
                    { id: 'opt4', text: 'Category D' }
                ],
                correctOptionId: 'opt2'
            },
            {
                id: 'q3-3',
                roundId: 'round-3',
                questionIndex: 2,
                text: 'What region accounted for the largest variance in last year\'s forecast?',
                options: [
                    { id: 'opt1', text: 'North America' },
                    { id: 'opt2', text: 'Europe' },
                    { id: 'opt3', text: 'Asia Pacific' },
                    { id: 'opt4', text: 'Latin America' }
                ],
                correctOptionId: 'opt1'
            },
            {
                id: 'q3-4',
                roundId: 'round-3',
                questionIndex: 3,
                text: 'What inventory adjustment should be made based on this forecast?',
                options: [
                    { id: 'opt1', text: 'Decrease all inventory by 10%' },
                    { id: 'opt2', text: 'Increase Category B by 20%' },
                    { id: 'opt3', text: 'Keep inventory flat' },
                    { id: 'opt4', text: 'Discontinue Category C entirely' }
                ],
                correctOptionId: 'opt2'
            }
        ]
    }
];

export const mockLeaderboard: LeaderboardEntry[] = [
    { rank: 1, teamId: 't-101', teamName: 'Data Sleuths', points: 300, roundsCompleted: 3, latestSubmissionTime: Date.now() - 3600000 },
    { rank: 2, teamId: 't-102', teamName: 'Query Masters', points: 280, roundsCompleted: 3, latestSubmissionTime: Date.now() - 2500000 },
    { rank: 3, teamId: 't-103', teamName: 'The Analysts', points: 250, roundsCompleted: 2, latestSubmissionTime: Date.now() - 1500000 },
    { rank: 4, teamId: 't-104', teamName: 'Pivot Ninjas', points: 210, roundsCompleted: 2, latestSubmissionTime: Date.now() - 5000000 },
    { rank: 5, teamId: 't-105', teamName: 'Null Pointers', points: 190, roundsCompleted: 2, latestSubmissionTime: Date.now() - 8000000 },
];
