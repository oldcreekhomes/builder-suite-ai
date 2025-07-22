
export interface ProjectTask {
  TaskID: string;
  TaskName: string;
  StartDate: Date;
  EndDate?: Date;
  Duration?: number;
  Progress: number;
  Predecessor?: string;
  parentID?: string;
  Resources?: number[]; // Array of resource IDs
  subtasks?: ProjectTask[];
}

// Define resource collection for Syncfusion Gantt
export interface ResourceData {
  resourceId: number;
  resourceName: string;
  resourceGroup: string;
  resourceUnit?: string;
}

export const resourceCollection: ResourceData[] = [
  { resourceId: 1, resourceName: 'John Smith', resourceGroup: 'Project Manager' },
  { resourceId: 2, resourceName: 'Construction Team', resourceGroup: 'Construction' },
  { resourceId: 3, resourceName: 'Site Supervisor', resourceGroup: 'Management' },
  { resourceId: 4, resourceName: 'Excavation Crew', resourceGroup: 'Construction' },
  { resourceId: 5, resourceName: 'Foundation Team', resourceGroup: 'Construction' },
  { resourceId: 6, resourceName: 'Steel Workers', resourceGroup: 'Construction' },
  { resourceId: 7, resourceName: 'Concrete Team', resourceGroup: 'Construction' },
  { resourceId: 8, resourceName: 'Electricians', resourceGroup: 'MEP' },
  { resourceId: 9, resourceName: 'Plumbers', resourceGroup: 'MEP' },
  { resourceId: 10, resourceName: 'HVAC Team', resourceGroup: 'MEP' },
  { resourceId: 11, resourceName: 'Drywall Crew', resourceGroup: 'Finishing' },
  { resourceId: 12, resourceName: 'Painters', resourceGroup: 'Finishing' },
  { resourceId: 13, resourceName: 'Flooring Team', resourceGroup: 'Finishing' },
  { resourceId: 14, resourceName: 'Inspector', resourceGroup: 'Quality Control' }
];

export const sampleProjectData: ProjectTask[] = [
  {
    TaskID: "1",
    TaskName: 'Foundation Work',
    StartDate: new Date('2024-01-15'),
    Duration: 15,
    Progress: 85,
    Resources: [1, 2],
    subtasks: [
      {
        TaskID: "1.1",
        TaskName: 'Site Preparation',
        StartDate: new Date('2024-01-15'),
        Duration: 3,
        Progress: 100,
        parentID: "1",
        Resources: [3, 2]
      },
      {
        TaskID: "1.2",
        TaskName: 'Excavation',
        StartDate: new Date('2024-01-18'),
        Duration: 4,
        Progress: 100,
        Predecessor: '1.1',
        parentID: "1",
        Resources: [4]
      },
      {
        TaskID: "1.3",
        TaskName: 'Foundation Pour',
        StartDate: new Date('2024-01-22'),
        Duration: 5,
        Progress: 90,
        Predecessor: '1.2',
        parentID: "1",
        Resources: [5, 7]
      },
      {
        TaskID: "1.4",
        TaskName: 'Foundation Curing',
        StartDate: new Date('2024-01-27'),
        Duration: 3,
        Progress: 50,
        Predecessor: '1.3',
        parentID: "1",
        Resources: [5]
      }
    ]
  },
  {
    TaskID: "2",
    TaskName: 'Structural Work',
    StartDate: new Date('2024-01-30'),
    Duration: 20,
    Progress: 30,
    Predecessor: '1',
    Resources: [1, 6],
    subtasks: [
      {
        TaskID: "2.1",
        TaskName: 'Steel Frame Installation',
        StartDate: new Date('2024-01-30'),
        Duration: 8,
        Progress: 60,
        parentID: "2",
        Resources: [6]
      },
      {
        TaskID: "2.2",
        TaskName: 'Concrete Slab Pour',
        StartDate: new Date('2024-02-07'),
        Duration: 6,
        Progress: 20,
        Predecessor: '2.1',
        parentID: "2",
        Resources: [7]
      },
      {
        TaskID: "2.3",
        TaskName: 'Roof Structure',
        StartDate: new Date('2024-02-13'),
        Duration: 6,
        Progress: 0,
        Predecessor: '2.2',
        parentID: "2",
        Resources: [6, 2]
      }
    ]
  },
  {
    TaskID: "3",
    TaskName: 'MEP Installation',
    StartDate: new Date('2024-02-19'),
    Duration: 18,
    Progress: 0,
    Predecessor: '2',
    Resources: [1],
    subtasks: [
      {
        TaskID: "3.1",
        TaskName: 'Electrical Rough-in',
        StartDate: new Date('2024-02-19'),
        Duration: 6,
        Progress: 0,
        parentID: "3",
        Resources: [8]
      },
      {
        TaskID: "3.2",
        TaskName: 'Plumbing Rough-in',
        StartDate: new Date('2024-02-19'),
        Duration: 6,
        Progress: 0,
        parentID: "3",
        Resources: [9]
      },
      {
        TaskID: "3.3",
        TaskName: 'HVAC Installation',
        StartDate: new Date('2024-02-25'),
        Duration: 8,
        Progress: 0,
        Predecessor: '3.1,3.2',
        parentID: "3",
        Resources: [10]
      }
    ]
  },
  {
    TaskID: "4",
    TaskName: 'Interior Finishing',
    StartDate: new Date('2024-03-09'),
    Duration: 15,
    Progress: 0,
    Predecessor: '3',
    Resources: [1],
    subtasks: [
      {
        TaskID: "4.1",
        TaskName: 'Drywall Installation',
        StartDate: new Date('2024-03-09'),
        Duration: 5,
        Progress: 0,
        parentID: "4",
        Resources: [11]
      },
      {
        TaskID: "4.2",
        TaskName: 'Painting',
        StartDate: new Date('2024-03-14'),
        Duration: 4,
        Progress: 0,
        Predecessor: '4.1',
        parentID: "4",
        Resources: [12]
      },
      {
        TaskID: "4.3",
        TaskName: 'Flooring Installation',
        StartDate: new Date('2024-03-18'),
        Duration: 6,
        Progress: 0,
        Predecessor: '4.2',
        parentID: "4",
        Resources: [13]
      }
    ]
  },
  {
    TaskID: "5",
    TaskName: 'Final Inspection',
    StartDate: new Date('2024-03-24'),
    Duration: 2,
    Progress: 0,
    Predecessor: '4',
    Resources: [14, 1]
  }
];
