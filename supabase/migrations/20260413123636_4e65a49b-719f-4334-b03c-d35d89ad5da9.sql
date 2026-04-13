INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('071212e3-288b-4e12-9b84-0c1e3a950d34', 'employee'),
  ('4416c4fa-c172-4ab1-a0d2-5dfec95e3be7', 'employee')
ON CONFLICT (user_id, role) DO NOTHING;