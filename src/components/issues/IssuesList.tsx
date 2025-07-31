import { IssuesTable } from "./IssuesTable";

interface IssuesListProps {
  category: string;
}

export function IssuesList({ category }: IssuesListProps) {
  return <IssuesTable category={category} />;
}