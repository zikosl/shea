// import { wsendpoint } from '@/constant';
// import { createClient } from 'graphql-ws';
// import { mutate } from 'swr';




// export function subscribe({ query, variables, next, session }) {
//     const client = createClient({
//         url: wsendpoint,
//         shouldRetry: () => true,
//         connectionParams: () => {

//             if (!session) {
//                 return {};
//             }
//             return {
//                 authentication: `Bearer ${session?.accessToken}`,
//             };
//         },
//     });
//     return client.subscribe(
//         {
//             query,
//             variables,
//         },
//         {
//             next: (data) => {

//                 return next(null, data);
//             },
//             error: (err) => next(err),
//             complete: () => client.terminate(),
//         }
//     );
// }
