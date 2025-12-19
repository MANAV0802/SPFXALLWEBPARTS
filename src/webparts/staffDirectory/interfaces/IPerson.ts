export interface IPerson {
  id: string;
  displayName: string;
  department?: string;
  jobTitle?: string;

  // Phones returned from Graph
  businessPhones?: string[];

  // Email always required
  email: string;

  // UPN always exists
  userPrincipalName: string;

  // Optional profile picture (base64 string)
  picture?: string;
}
