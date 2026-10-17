import React from 'react';
import { RouterDevice } from '../../types';
import { RemoteTerminalModal } from './RemoteTerminalModal';

interface InteractiveTerminalModalProps {
  router: RouterDevice;
  onClose: () => void;
  onExecuteCommand?: (routerId: string, command: string) => Promise<{ output: string; status: 'success' | 'error' }>;
}

export const InteractiveTerminalModal: React.FC<InteractiveTerminalModalProps> = ({
  router,
  onClose,
}) => {
  return (
    <RemoteTerminalModal
      router={router}
      isOpen={true}
      onClose={onClose}
    />
  );
};
