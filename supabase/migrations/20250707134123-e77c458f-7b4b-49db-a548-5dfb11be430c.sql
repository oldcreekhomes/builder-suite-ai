-- Create employee chat rooms table
CREATE TABLE public.employee_chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  is_direct_message BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- Create employee chat participants table
CREATE TABLE public.employee_chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.employee_chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create employee chat messages table
CREATE TABLE public.employee_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.employee_chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text TEXT,
  file_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.employee_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat rooms
CREATE POLICY "Users can view chat rooms they participate in" 
ON public.employee_chat_rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.employee_chat_participants 
    WHERE room_id = employee_chat_rooms.id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chat rooms" 
ON public.employee_chat_rooms 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update chat rooms they created" 
ON public.employee_chat_rooms 
FOR UPDATE 
USING (created_by = auth.uid());

-- RLS Policies for chat participants
CREATE POLICY "Users can view participants in their chat rooms" 
ON public.employee_chat_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.employee_chat_participants p2 
    WHERE p2.room_id = employee_chat_participants.room_id 
    AND p2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add participants to chat rooms they're in" 
ON public.employee_chat_participants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employee_chat_participants p2 
    WHERE p2.room_id = employee_chat_participants.room_id 
    AND p2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own participant records" 
ON public.employee_chat_participants 
FOR UPDATE 
USING (user_id = auth.uid());

-- RLS Policies for chat messages
CREATE POLICY "Users can view messages in their chat rooms" 
ON public.employee_chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.employee_chat_participants 
    WHERE room_id = employee_chat_messages.room_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their chat rooms" 
ON public.employee_chat_messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.employee_chat_participants 
    WHERE room_id = employee_chat_messages.room_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.employee_chat_messages 
FOR UPDATE 
USING (sender_id = auth.uid());

-- Create function to get or create direct message room between two users
CREATE OR REPLACE FUNCTION public.get_or_create_dm_room(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if a direct message room already exists between these users
  SELECT er.id INTO room_id
  FROM public.employee_chat_rooms er
  WHERE er.is_direct_message = true
    AND EXISTS (
      SELECT 1 FROM public.employee_chat_participants ep1
      WHERE ep1.room_id = er.id AND ep1.user_id = current_user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.employee_chat_participants ep2
      WHERE ep2.room_id = er.id AND ep2.user_id = other_user_id
    )
    AND (
      SELECT COUNT(*) FROM public.employee_chat_participants ep3
      WHERE ep3.room_id = er.id
    ) = 2;
  
  -- If no room exists, create one
  IF room_id IS NULL THEN
    INSERT INTO public.employee_chat_rooms (is_direct_message, created_by)
    VALUES (true, current_user_id)
    RETURNING id INTO room_id;
    
    -- Add both participants
    INSERT INTO public.employee_chat_participants (room_id, user_id)
    VALUES 
      (room_id, current_user_id),
      (room_id, other_user_id);
  END IF;
  
  RETURN room_id;
END;
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON public.employee_chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_updated_at();

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.employee_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_updated_at();