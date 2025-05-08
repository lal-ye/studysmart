import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, Edit3, BarChart, FileText, ListChecks, ClipboardEdit } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <BookOpen className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold">Welcome to StudySmarts!</CardTitle>
              <CardDescription className="text-lg">
                Your AI-powered learning assistant. Let's get started.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-muted-foreground">
            StudySmarts helps you transform your course materials into dynamic notes, generate quizzes for self-assessment, create comprehensive exams, and get personalized study plans. Navigate through the sections using the sidebar or the quick links below.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={<FileText className="h-8 w-8 text-primary" />}
              title="Dynamic Notes"
              description="Generate interactive notes from your PDF or text materials."
              href="/notes"
            />
            <FeatureCard
              icon={<ListChecks className="h-8 w-8 text-primary" />}
              title="Quizzes"
              description="Create quizzes to test your understanding of the course content."
              href="/quizzes"
            />
            <FeatureCard
              icon={<ClipboardEdit className="h-8 w-8 text-primary" />}
              title="Exams"
              description="Generate and analyze exams to identify strengths and weaknesses."
              href="/exams"
            />
             <FeatureCard
              icon={<BarChart className="h-8 w-8 text-primary" />}
              title="Analytics"
              description="Track your progress and view detailed performance analytics."
              href="/analytics"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">How it Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            <strong>1. Upload Material:</strong> Provide your course content in text format.
          </p>
          <p>
            <strong>2. Generate:</strong> Use our AI tools to create notes, quizzes, or exams.
          </p>
          <p>
            <strong>3. Learn & Assess:</strong> Review your personalized materials and test your knowledge.
          </p>
          <p>
            <strong>4. Improve:</strong> Get feedback and a study plan to focus on areas needing improvement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

function FeatureCard({ icon, title, description, href }: FeatureCardProps) {
  return (
    <Card className="hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        {icon}
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <Link href={href} passHref>
          <Button variant="outline" className="w-full">
            Go to {title}
            <Edit3 className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
