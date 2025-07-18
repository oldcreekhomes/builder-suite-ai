export const projectNewData = [
  {
    TaskID: 1,
    TaskName: 'Product Concept',
    StartDate: new Date('04/02/2019'),
    Duration: 5,
    Progress: 40,
    subtasks: [
      {
        TaskID: 2,
        TaskName: 'Defining the product and its usage',
        StartDate: new Date('04/02/2019'),
        Duration: 3,
        Progress: 30
      },
      {
        TaskID: 3,
        TaskName: 'Defining target audience',
        StartDate: new Date('04/02/2019'),
        Duration: 3,
        Progress: 40
      },
      {
        TaskID: 4,
        TaskName: 'Prepare product sketch and notes',
        StartDate: new Date('04/02/2019'),
        Duration: 2,
        Progress: 30
      }
    ]
  },
  {
    TaskID: 5,
    TaskName: 'Concept Approval',
    StartDate: new Date('04/02/2019'),
    Duration: 0,
    Progress: 0,
    Predecessor: '3,4'
  },
  {
    TaskID: 6,
    TaskName: 'Market Research',
    StartDate: new Date('04/02/2019'),
    Duration: 4,
    Progress: 60,
    subtasks: [
      {
        TaskID: 7,
        TaskName: 'Demand Analysis',
        StartDate: new Date('04/04/2019'),
        Duration: 4,
        Progress: 80
      },
      {
        TaskID: 8,
        TaskName: 'Customer Strength',
        StartDate: new Date('04/04/2019'),
        Duration: 4,
        Progress: 30
      },
      {
        TaskID: 9,
        TaskName: 'Market Opportunity Analysis',
        StartDate: new Date('04/02/2019'),
        Duration: 4,
        Progress: 30
      }
    ]
  },
  {
    TaskID: 10,
    TaskName: 'Competitor Analysis',
    StartDate: new Date('04/02/2019'),
    Duration: 4,
    Progress: 30,
    subtasks: [
      {
        TaskID: 11,
        TaskName: 'Product Strength Analysis',
        StartDate: new Date('04/02/2019'),
        Duration: 4,
        Progress: 40
      },
      {
        TaskID: 12,
        TaskName: 'Product Positioning',
        StartDate: new Date('04/02/2019'),
        Duration: 4,
        Progress: 30
      }
    ]
  },
  {
    TaskID: 13,
    TaskName: 'Research Complete',
    StartDate: new Date('04/02/2019'),
    Duration: 0,
    Progress: 0,
    Predecessor: '10'
  }
];