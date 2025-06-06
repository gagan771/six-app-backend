import driver from '../config/neo4j';

export async function seedData() {
  const session = driver.session();

  const totalUsers = 50; 
  const users = Array.from({ length: totalUsers }, (_, i) => `user${i + 1}`);

  console.log('seeding data...');

  try {
    for (let i = 0; i < users.length; i++) {
      const user1 = users[i];
      for (let j = i + 1; j < i + 4 && j < users.length; j++) {
        const user2 = users[j];
        await session.run(
          `
          MERGE (u1:User {id: $user1})
          MERGE (u2:User {id: $user2})
          MERGE (u1)-[:CONNECTED_TO]->(u2)
          `,
          { user1, user2 }
        );
      }
    }
    console.log('Seeding complete.');
  } finally {
    await session.close();
  }
}
