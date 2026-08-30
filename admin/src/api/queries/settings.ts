import { gql } from "graphql-request";

export const FIND_MANY_PRICING = gql`
  query findManyPricing {
    findManyPricing {
      id
      name
      price
    }
  }
`;

export const FIND_MANY_SCHEDULES = gql`
  query findManySchedule {
    findManySchedule {
      id
      time
      isActive
    }
  }
`;
