import { gql } from "graphql-request";

export const ADMIN_DASHBOARD_STATS = gql`
  query adminDashboardStats {
    adminDashboardStats {
      today {
        orders
        grossRevenue
        partnerFees
        netRevenue
        averageOrderValue
      }
      week {
        orders
        grossRevenue
        partnerFees
        netRevenue
        averageOrderValue
      }
      month {
        orders
        grossRevenue
        partnerFees
        netRevenue
        averageOrderValue
      }
      totalOrders
      pendingDeliveries
      completedDeliveries
      canceledDeliveries
      clientsCount
      partnersCount
      activePartners
      driversCount
      activeDrivers
      nichesCount
      categoriesCount
      productTemplatesCount
      productsCount
      lowStockProducts
      outOfStockProducts
      pendingProductRequests
      ordersTrend {
        label
        orders
        revenue
      }
      topPartners {
        id
        name
        count
        value
      }
      topNiches {
        id
        name
        count
        value
      }
      recentOrders {
        id
        date
        total
        source
        partnerName
        clientName
      }
    }
  }
`;
