import { gql } from "graphql-request";

const CREATE_NICHE = gql`
  mutation createNiche($name: String!, $name_ar: String!, $image: String) {
    createNiche(name: $name, name_ar: $name_ar, image: $image) {
      id
      name
      name_ar
      image
    }
  }
`;

const UPDATE_NICHE = gql`
  mutation updateNiche($id: Int!, $name: String, $name_ar: String, $image: String) {
    updateNiche(id: $id, name: $name, name_ar: $name_ar, image: $image) {
      id
      name
      name_ar
      image
    }
  }
`;

const DELETE_NICHE = gql`
  mutation deleteNiche($id: Int!) {
    deleteNiche(id: $id) {
      id
    }
  }
`;

export {
  CREATE_NICHE,
  UPDATE_NICHE,
  DELETE_NICHE,
};
