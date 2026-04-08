import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { extractBrands } from '../scripts/script';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  // await prisma.otp.deleteMany();
  // await prisma.token.deleteMany();
  // await prisma.product.deleteMany();
  // await prisma.productType.deleteMany();
  // await prisma.brand.deleteMany();
  // await prisma.category.deleteMany();
  // await prisma.admin.deleteMany();
  // await prisma.driver.deleteMany();
  // await prisma.partner.deleteMany();
  // await prisma.client.deleteMany();
  // await prisma.user.deleteMany();

  // Create Users with role-specific data  


  const adminUser = await prisma.user.create({
    data: {
      email: "zakariaslimi53@gmail.com",
      role: "ADMIN",
      passwordHash: bcrypt.hashSync("Azerty123@"),
      authMethod: "EMAIL_PASSWORD",
      admin: {
        create: {
          firstname: 'Sarah',
          lastname: 'Smith',
          birthday: new Date('1985-05-15'),
          city: 16,
          privileges: ['super_admin', 'content_moderation']
        }
      }
    }
  });

  // const clientUser = await prisma.user.create({
  //   data: {
  //     email: 'client@example.com',
  //     oauthId: 'google-oauth-id-123',
  //     authMethod: 'GOOGLE',
  //     role: 'CLIENT',
  //     client: {
  //       create: {
  //         firstname: 'John',
  //         lastname: 'Doe',
  //         avatar: 'https://i.pravatar.cc/300?img=10', // Real user image
  //         language: 'en',
  //         theme: true
  //       }
  //     }
  //   },
  // });

  // const partnerUser = await prisma.user.create({
  //   data: {
  //     phone: '+971501234567',
  //     authMethod: 'OTP',
  //     role: 'PARTNER',
  //     partner: {
  //       create: {
  //         companyName: 'Delicious Catering Co.'
  //       }
  //     }
  //   },
  // });

  // const driverUser = await prisma.user.create({
  //   data: {
  //     email: 'driver@example.com',
  //     passwordHash: '$2b$10$DRIVERHASHEDPASSWORD',
  //     authMethod: 'EMAIL_PASSWORD',
  //     role: 'DRIVER',
  //     driver: {
  //       create: {
  //         licenseNo: 'UAE-1234567'
  //       }
  //     }
  //   },
  // });

  // // Create Tokens
  await prisma.token.create({
    data: {
      userId: adminUser.id,
      refreshToken: uuidv4(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  // // Create Categories with images
  // const electronicsCategory = await prisma.category.create({
  //   data: {
  //     name: 'Electronics',
  //     name_ar: 'إلكترونيات',
  //     image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
  //   },
  // });

  // const clothingCategory = await prisma.category.create({
  //   data: {
  //     name: 'Clothing',
  //     name_ar: 'ملابس',
  //     image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
  //   },
  // });

  // // Create Brands with logos
  // const samsungBrand = await prisma.brand.create({
  //   data: {
  //     name: 'Samsung',
  //     image: 'https://logos-world.net/wp-content/uploads/2020/11/Samsung-Logo-700x394.png',
  //   },
  // });

  // const nikeBrand = await prisma.brand.create({
  //   data: {
  //     name: 'Nike',
  //     image: 'https://static.vecteezy.com/system/resources/previews/010/994/412/non_2x/nike-logo-black-clothes-design-icon-abstract-football-illustration-with-white-background-free-vector.jpg',
  //   },
  // });

  // // Create Product Types
  // const smartphoneType = await prisma.productType.create({
  //   data: {
  //     name: 'Smartphones',
  //     name_ar: 'الهواتف الذكية',
  //     category_id: electronicsCategory.id,
  //   },
  // });

  // const tshirtType = await prisma.productType.create({
  //   data: {
  //     name: 'T-Shirts',
  //     name_ar: 'التيشيرتات',
  //     category_id: clothingCategory.id,
  //   },
  // });

  // // Create Products with images
  // await prisma.product.create({
  //   data: {
  //     name: 'Galaxy S23 Ultra',
  //     image: 'https://images.samsung.com/is/image/samsung/p6pim/ae/2302/gallery/ae-galaxy-s23-ultra-sm-s918bzkgmea-thumb-534864917?$216_216_PNG$',
  //     brand_id: samsungBrand.id,
  //     product_type_id: smartphoneType.id,
  //   },
  // });

  // await prisma.product.create({
  //   data: {
  //     name: 'Air Jordan 1',
  //     image: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/5c8e2481-ebc7-4a88-8c8c-0d5b2b1e3b3a/air-jordan-1-mid-shoes-86f1CS.png',
  //     brand_id: nikeBrand.id,
  //     product_type_id: tshirtType.id,
  //   },
  // });

  // // Create OTP entry
  // await prisma.otp.create({
  //   data: {
  //     phone: '+971501234567',
  //     code: '654321',
  //     expiresAt: new Date(Date.now() + 300000), // 5 minutes
  //     verified: false,
  //   },
  // });
}

(async () => {
  await main();
  await extractBrands();
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });