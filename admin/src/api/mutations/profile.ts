import { gql } from "graphql-request"


const LOGIN = gql`
  mutation signIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      accessToken
      refreshToken
      tokenId
      accessTokenExpires
      user {
        id
        email
        admin {
          firstname
          lastname
          birthday
          city
        }
      }
    }
  }
`;

const UPDATE_PROFILE = gql`
  mutation updateProfile($firstname: String!, $lastname: String!,$birthday: DateTime!, $city: Int!) {
    updateProfile(firstname: $firstname, lastname: $lastname, birthday: $birthday, city: $city) {
      accessToken
      refreshToken
      tokenId
      accessTokenExpires
      user {
        id
        email
        admin {
          firstname
          lastname
          birthday
          city
        }
      }
    }
  }
`;


const REFRESH_TOKEN = gql`
  mutation refreshToken($data: String!) {
    refreshToken(data: $data) {
      accessToken
      refreshToken
      tokenId
      accessTokenExpires
      user {
        id
        email
        admin {
          firstname
          lastname
          birthday
          city
        }
      }
    }
  }
`;

const LOGOUT = gql`
  mutation logout {
    logout
  }
`;


export {
  LOGIN,
  UPDATE_PROFILE,
  REFRESH_TOKEN,
  LOGOUT
}
