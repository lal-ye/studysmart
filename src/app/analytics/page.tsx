import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart, PieChart, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell, LineChart as RechartsLineChart, Line } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Mock data - replace with actual data fetching and processing logic
const mockQuizScores = [
  { name: 'Quiz 1', score: 80, date: '2024-07-01' },
  { name: 'Quiz 2', score: 75, date: '2024-07-08' },
  { name: 'Quiz 3', score: 90, date: '2024-07-15' },
  { name: 'Quiz 4', score: 85, date: '2024-07-22' },
];

const mockExamScores = [
  { name: 'Midterm Exam', score: 78, date: '2024-07-10' },
  { name: 'Final Exam', score: 88, date: '2024-07-30' },
];

const mockTopicPerformance = [
  { topic: 'Algebra', correct: 15, total: 20 },
  { topic: 'Calculus', correct: 12, total: 20 },
  { topic: 'Geometry', correct: 18, total: 20 },
  { topic: 'Statistics', correct: 10, total: 15 },
];

const topicPerformanceChartData = mockTopicPerformance.map(item => ({
  name: item.topic,
  accuracy: (item.correct / item.total) * 100,
}));

const topicPerformanceChartConfig = {
  accuracy: {
    label: "Accuracy",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const overallProgressChartData = [
  ...mockQuizScores.map(q => ({ date: q.date, type: 'Quiz', score: q.score })),
  ...mockExamScores.map(e => ({ date: e.date, type: 'Exam', score: e.score })),
].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

const overallProgressChartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--chart-2))",
  }
} satisfies ChartConfig;

const overallScore = (mockQuizScores.reduce((sum, q) => sum + q.score, 0) + mockExamScores.reduce((sum, e) => sum + e.score, 0)) / (mockQuizScores.length + mockExamScores.length);
const totalQuizzesTaken = mockQuizScores.length;
const totalExamsTaken = mockExamScores.length;


export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BarChart className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold">Analytics Dashboard</CardTitle>
              <CardDescription>
                Track your learning progress, quiz and exam scores, and identify areas for improvement.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <InfoCard title="Overall Average Score" value={`${overallScore.toFixed(1)}%`} icon={<Activity className="h-6 w-6 text-primary" />} />
        <InfoCard title="Quizzes Taken" value={totalQuizzesTaken.toString()} icon={<TrendingUp className="h-6 w-6 text-green-500" />} />
        <InfoCard title="Exams Taken" value={totalExamsTaken.toString()} icon={<TrendingDown className="h-6 w-6 text-red-500" />} />
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Overall Score Progress</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ChartContainer config={overallProgressChartConfig} className="w-full h-full">
            <RechartsLineChart data={overallProgressChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip content={<ChartTooltipContent indicator="line" />} />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-score)" }} activeDot={{ r: 6 }} />
            </RechartsLineChart>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Topic Performance (Accuracy %)</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ChartContainer config={topicPerformanceChartConfig} className="w-full h-full">
            <RechartsBarChart data={topicPerformanceChartData} layout="vertical" margin={{ right: 30 }}>
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false}/>
              <Tooltip content={<ChartTooltipContent indicator="dot" />} />
              <Legend />
              <Bar dataKey="accuracy" fill="var(--color-accuracy)" radius={4} />
            </RechartsBarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Quiz Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{}} className="w-full h-full">
                <RechartsPieChart>
                    <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Pie data={mockQuizScores} dataKey="score" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {mockQuizScores.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index % 5 + 1}))`} />
                        ))}
                    </Pie>
                    <Legend/>
                </RechartsPieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Areas for Improvement</CardTitle>
            <CardDescription>Based on lowest topic scores.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {mockTopicPerformance
                .sort((a, b) => (a.correct / a.total) - (b.correct / b.total))
                .slice(0, 3) // Show top 3 areas for improvement
                .map(item => (
                  <li key={item.topic} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                    <span>{item.topic}</span>
                    <span className="font-semibold text-destructive">{((item.correct / item.total) * 100).toFixed(1)}%</span>
                  </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


interface InfoCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
}

function InfoCard({ title, value, icon, description }: InfoCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
