import { gql } from "graphql-request";

export const UPSERT_PRICING = gql`
  mutation upsertPricing($name: PricingName!, $price: Int!) {
    upsertPricing(name: $name, price: $price) {
      id
      name
      price
    }
  }
`;

export const CREATE_SCHEDULE = gql`
  mutation createSchedule($time: String!) {
    createSchedule(time: $time) {
      id
      time
      isActive
    }
  }
`;

export const DELETE_SCHEDULE = gql`
  mutation deleteSchedule($id: Int!) {
    deleteSchedule(id: $id) {
      id
    }
  }
`;
