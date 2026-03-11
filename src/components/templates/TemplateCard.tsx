import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TemplateCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
}

const TemplateCard = ({ title, description, icon: Icon, route }: TemplateCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={() => navigate(route)} className="w-full">
          Use Template
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TemplateCard;
