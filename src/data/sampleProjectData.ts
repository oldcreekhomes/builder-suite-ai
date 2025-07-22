
export interface ProjectTask {
  TaskID: number;
  TaskName: string;
  StartDate: Date;
  EndDate?: Date;
  Duration?: number;
  Progress: number;
  Predecessor?: string;
  parentID?: number;
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
    TaskID: 1,
    TaskName: 'Foundation Work',
    StartDate: new Date('2024-01-15'),
    Duration: 15,
    Progress: 85,
    Resources: [1, 2],
    subtasks: [
      {
        TaskID: 2,
        TaskName: 'Site Preparation',
        StartDate: new Date('2024-01-15'),
        Duration: 3,
        Progress: 100,
        parentID: 1,
        Resources: [3, 2]
      },
      {
        TaskID: 3,
        TaskName: 'Excavation',
        StartDate: new Date('2024-01-18'),
        Duration: 4,
        Progress: 100,
        Predecessor: '2',
        parentID: 1,
        Resources: [4]
      },
      {
        TaskID: 4,
        TaskName: 'Foundation Pour',
        StartDate: new Date('2024-01-22'),
        Duration: 5,
        Progress: 90,
        Predecessor: '3',
        parentID: 1,
        Resources: [5, 7]
      },
      {
        TaskID: 5,
        TaskName: 'Foundation Curing',
        StartDate: new Date('2024-01-27'),
        Duration: 3,
        Progress: 50,
        Predecessor: '4',
        parentID: 1,
        Resources: [5]
      }
    ]
  },
  {
    TaskID: 6,
    TaskName: 'Structural Work',
    StartDate: new Date('2024-01-30'),
    Duration: 20,
    Progress: 30,
    Predecessor: '1',
    Resources: [1, 6],
    subtasks: [
      {
        TaskID: 7,
        TaskName: 'Steel Frame Installation',
        StartDate: new Date('2024-01-30'),
        Duration: 8,
        Progress: 60,
        parentID: 6,
        Resources: [6]
      },
      {
        TaskID: 8,
        TaskName: 'Concrete Slab Pour',
        StartDate: new Date('2024-02-07'),
        Duration: 6,
        Progress: 20,
        Predecessor: '7',
        parentID: 6,
        Resources: [7]
      },
      {
        TaskID: 9,
        TaskName: 'Roof Structure',
        StartDate: new Date('2024-02-13'),
        Duration: 6,
        Progress: 0,
        Predecessor: '8',
        parentID: 6,
        Resources: [6, 2]
      }
    ]
  },
  {
    TaskID: 10,
    TaskName: 'MEP Installation',
    StartDate: new Date('2024-02-19'),
    Duration: 18,
    Progress: 0,
    Predecessor: '6',
    Resources: [1],
    subtasks: [
      {
        TaskID: 11,
        TaskName: 'Electrical Rough-in',
        StartDate: new Date('2024-02-19'),
        Duration: 6,
        Progress: 0,
        parentID: 10,
        Resources: [8]
      },
      {
        TaskID: 12,
        TaskName: 'Plumbing Rough-in',
        StartDate: new Date('2024-02-19'),
        Duration: 6,
        Progress: 0,
        parentID: 10,
        Resources: [9]
      },
      {
        TaskID: 13,
        TaskName: 'HVAC Installation',
        StartDate: new Date('2024-02-25'),
        Duration: 8,
        Progress: 0,
        Predecessor: '11,12',
        parentID: 10,
        Resources: [10]
      }
    ]
  },
  {
    TaskID: 14,
    TaskName: 'Interior Finishing',
    StartDate: new Date('2024-03-09'),
    Duration: 15,
    Progress: 0,
    Predecessor: '10',
    Resources: [1],
    subtasks: [
      {
        TaskID: 15,
        TaskName: 'Drywall Installation',
        StartDate: new Date('2024-03-09'),
        Duration: 5,
        Progress: 0,
        parentID: 14,
        Resources: [11]
      },
      {
        TaskID: 16,
        TaskName: 'Painting',
        StartDate: new Date('2024-03-14'),
        Duration: 4,
        Progress: 0,
        Predecessor: '15',
        parentID: 14,
        Resources: [12]
      },
      {
        TaskID: 17,
        TaskName: 'Flooring Installation',
        StartDate: new Date('2024-03-18'),
        Duration: 6,
        Progress: 0,
        Predecessor: '16',
        parentID: 14,
        Resources: [13]
      }
    ]
  },
  {
    TaskID: 18,
    TaskName: 'Final Inspection',
    StartDate: new Date('2024-03-24'),
    Duration: 2,
    Progress: 0,
    Predecessor: '14',
    Resources: [14, 1]
  }
];
