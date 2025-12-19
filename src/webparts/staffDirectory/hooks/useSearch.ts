import * as React from 'react';
import useGraphClient from './useGraphClient';
import {
  AadHttpClient,
  IAadHttpClientConfiguration
} from '@microsoft/sp-http';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { IPerson } from '../interfaces/IPerson';

interface IUseSearch {
  searchByText: (str: string, filterDepartment?: string) => Promise<void>;
  getNextPage: () => Promise<void>;
  total: number;
  loading: boolean;
  nextPage: string;
  results: IPerson[];
}

export interface IExecuteBatchRequest {
  method: string;
  url: string;
  id: string | number;
  headers?: HeadersInit;
  body?: string;
}

export interface IExecuteBatchResponse {
  id: string | number;
  status: string;
  body: string;
}

const GRAPH_URL = "https://graph.microsoft.com/v1.0";

const OPTIONS: IAadHttpClientConfiguration = {
  headers: {
    ConsistencyLevel: "Eventual",
    Accept: "application/json",
    "Content-Type": "application/json"
  }
};

const SELECT = [
  "id",
  "displayName",
  "department",
  "jobTitle",
  "businessPhones",
  "mail",
  "userPrincipalName"
];

/* -------------------------------------------------------
   Map Graph User to your IPerson interface
------------------------------------------------------- */
const mapGraphUserToPerson = (u: any): IPerson => {
  return {
    id: u.id,
    displayName: u.displayName || "",
    department: u.department || "",
    jobTitle: u.jobTitle || "",
    businessPhones: u.businessPhones || [],
    email: u.mail || u.userPrincipalName,  // always present
    userPrincipalName: u.userPrincipalName,
    picture: undefined
  };
};

/* ------------------------------------------------------ */

const useSearch = (
  context: WebPartContext,
  group: string,
  pageSize: number
): IUseSearch => {

  const [loading, setLoading] = React.useState<boolean>(false);
  const [nextPage, setNextPage] = React.useState<string>("");
  const [results, setResults] = React.useState<IPerson[]>([]);
  const [total, setTotal] = React.useState<number>(0);

  const { client } = useGraphClient(context);

  /* -------------------------------------------------------
      Batch request for photos
  --------------------------------------------------------- */
  const executeBatch = React.useCallback(
    async (method: string, requests: IExecuteBatchRequest[]): Promise<IExecuteBatchResponse[]> => {
      if (!client) return [];

      const batchBody = {
        requests: requests.map((item: IExecuteBatchRequest) => ({
          id: item.id,
          method,
          url: item.url,
          headers: item.headers ?? {},
          body: item.body ?? {}
        }))
      };

      try {
        const res = await client.post(
          `${GRAPH_URL}/$batch`,
          AadHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(batchBody)
          }
        );

        const json = await res.json();

        return json.responses.map((val: any) => ({
          id: val.id,
          status: val.status,
          body: val.body
        }));

      } catch (e) {
        console.error("Batch error:", e);
        return [];
      }
    },
    [client]
  );

  /* -------------------------------------------------------
      Load profile photos
  --------------------------------------------------------- */
  const fetchUserImages = React.useCallback(
    async (people: IPerson[]): Promise<IPerson[]> => {
      if (people.length === 0) return people;

      const requests: IExecuteBatchRequest[] = people.map((p) => ({
        url: `/users/${p.id}/photo/$value`,
        method: "GET",
        id: p.id
      }));

      const responses = await executeBatch("GET", requests);

      const lookup: Record<string, string> = {};

      responses.forEach((r: IExecuteBatchResponse) => {
        lookup[r.id] = r.body;
      });

      return people.map((p) => ({
        ...p,
        picture: lookup[p.id] || undefined
      }));
    },
    [executeBatch]
  );

  /* -------------------------------------------------------
      SEARCH USERS
  --------------------------------------------------------- */
  const searchByText = React.useCallback(
    async (str: string, filterDepartment = "") => {
      try {
        if (!client) return;

        setLoading(true);
        setResults([]); // new search resets list

        let url = `${GRAPH_URL}/`;

        url += group !== ""
          ? `groups/${group}/members?`
          : `users?`;

        if (str) {
          url += `$search="displayName:${str}" OR "department:${str}" OR "jobTitle:${str}"&`;
        }

        url += `$top=${pageSize}&$select=${SELECT.join(",")}&$count=true&`;

        if (filterDepartment) {
          url += `$filter=department eq '${filterDepartment}'`;
        }

        const res = await client.get(url, AadHttpClient.configurations.v1, OPTIONS);
        const json = await res.json();

        const mapped = json.value.map(mapGraphUserToPerson);
        const people = await fetchUserImages(mapped);

        setResults(people);
        setNextPage(json["@odata.nextLink"]);
        setTotal(json["@odata.count"]);
        setLoading(false);

      } catch (e) {
        console.error("Search error:", e);
        setLoading(false);
      }
    },
    [client, group, pageSize, fetchUserImages]
  );

  /* -------------------------------------------------------
      PAGINATION
  --------------------------------------------------------- */
  const getNextPage = React.useCallback(async () => {
    try {
      if (!client || !nextPage) return;

      setLoading(true);

      const res = await client.get(nextPage, AadHttpClient.configurations.v1, OPTIONS);
      const json = await res.json();

      const mapped = json.value.map(mapGraphUserToPerson);
      const people = await fetchUserImages(mapped);

      // Append instead of overwrite
      setResults((prev) => [...prev, ...people]);

      setNextPage(json["@odata.nextLink"]);
      setLoading(false);

    } catch (e) {
      console.error("Next page error:", e);
      setLoading(false);
    }
  }, [client, nextPage, fetchUserImages]);

  /* -------------------------------------------------------
      INITIAL LOAD
  --------------------------------------------------------- */
  React.useEffect(() => {
    if (client) {
      searchByText("").catch(console.error);
    }
  }, [client]);

  return {
    searchByText,
    getNextPage,
    total,
    loading,
    nextPage,
    results
  };
};

export default useSearch;
