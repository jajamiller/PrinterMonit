import asyncio
import sys
sys.path.append('.')

from app.database import get_session
from app.models import User
from app.security import hash_password

async def reset_admin():
    async with get_session()() as session:
        from sqlalchemy import select
        # Find admin user
        res = await session.execute(select(User).where(User.email == 'admin@savepage.com'))
        user = res.scalar_one_or_none()
        if user:
            print('Found admin:', user.email)
            # Reset password to 'admin123'
            user.hashed_password = hash_password('admin123')
            session.add(user)
            await session.commit()
            print('Password reset to admin123')
            return True
        else:
            print('Admin not found, creating...')
            new_user = User(
                email='admin@savepage.com',
                full_name='Administrador',
                hashed_password=hash_password('admin123'),
                role='admin',
                is_active=True,
            )
            session.add(new_user)
            await session.commit()
            print('Created admin user with password admin123')
            return True

async def main():
    success = False
    for i in range(3):  # Try 3 times
        try:
            success = await reset_admin()
            break
        except Exception as e:
            print(f'Attempt {i+1} failed:', e)
            if i < 2:  # Don't sleep on last attempt
                await asyncio.sleep(2)
    
    print('Success:', success)

if __name__ == '__main__':
    asyncio.run(main())
