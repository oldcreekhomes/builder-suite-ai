import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TemplateCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
  onEdit?: () => void;
}

const TemplateCard = ({ title, description, icon: Icon, route, onEdit }: TemplateCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {onEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  Edit Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
