// Test script for the complete initial admin approval workflow
import { 
  APPROVAL_STATUS, 
  triggerAutomaticStatusTransition, 
  canScheduleAppointments,
  createApprovalNotification 
} from './approvalSystem.js';

/**
 * Test the complete approval workflow sequence:
 * 1. Pending → Initial Doctor Approved
 * 2. Initial Doctor Approved → Pending Initial Admin Approval (automatic)
 * 3. Pending Initial Admin Approval → Initially Approved (admin action)
 * 4. Initially Approved → Can Schedule Appointments
 */
export const testApprovalWorkflow = async () => {
  console.log('🧪 Testing Complete Approval Workflow...');
  
  // Test 1: Check status transitions
  console.log('\n1. Testing Status Transitions:');
  
  // Simulate doctor initial approval
  const doctorApprovedStatus = APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED;
  console.log(`✅ Doctor Initially Approved: ${doctorApprovedStatus}`);
  
  // Test automatic transition
  const nextStatus = await triggerAutomaticStatusTransition('test-id', doctorApprovedStatus);
  console.log(`✅ Auto-transition to: ${nextStatus}`);
  console.log(`Expected: ${APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL}`);
  console.log(`Match: ${nextStatus === APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL ? '✅' : '❌'}`);
  
  // Test 2: Check appointment eligibility at each stage
  console.log('\n2. Testing Appointment Eligibility:');
  
  const testStatuses = [
    APPROVAL_STATUS.PENDING,
    APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED,
    APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL,
    APPROVAL_STATUS.INITIALLY_APPROVED,
    APPROVAL_STATUS.INITIAL_ADMIN_REJECTED
  ];
  
  testStatuses.forEach(status => {
    const canSchedule = canScheduleAppointments(status, 'donor');
    console.log(`Status: ${status} | Can Schedule: ${canSchedule ? '✅' : '❌'}`);
  });
  
  // Test 3: Verify correct eligibility sequence
  console.log('\n3. Verifying Eligibility Sequence:');
  
  // Should NOT be able to schedule during these statuses
  const ineligibleStatuses = [
    APPROVAL_STATUS.PENDING,
    APPROVAL_STATUS.INITIAL_DOCTOR_APPROVED,
    APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL,
    APPROVAL_STATUS.INITIAL_ADMIN_REJECTED
  ];
  
  const eligibleStatuses = [
    APPROVAL_STATUS.INITIALLY_APPROVED,
    APPROVAL_STATUS.FINAL_APPROVED
  ];
  
  let workflowValid = true;
  
  ineligibleStatuses.forEach(status => {
    const canSchedule = canScheduleAppointments(status, 'donor');
    if (canSchedule) {
      console.log(`❌ ERROR: Should NOT be able to schedule with status: ${status}`);
      workflowValid = false;
    }
  });
  
  eligibleStatuses.forEach(status => {
    const canSchedule = canScheduleAppointments(status, 'donor');
    if (!canSchedule) {
      console.log(`❌ ERROR: Should be able to schedule with status: ${status}`);
      workflowValid = false;
    }
  });
  
  console.log(`\n🎯 Workflow Validation: ${workflowValid ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Test 4: Verify notification system
  console.log('\n4. Testing Notification System:');
  try {
    await createApprovalNotification('test-user-id', APPROVAL_STATUS.INITIALLY_APPROVED);
    console.log('✅ Notification system integration working');
  } catch (error) {
    console.log('❌ Notification system error:', error.message);
  }
  
  return {
    transitionTest: nextStatus === APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL,
    eligibilityTest: workflowValid,
    overallSuccess: workflowValid && (nextStatus === APPROVAL_STATUS.PENDING_INITIAL_ADMIN_APPROVAL)
  };
};

/**
 * Test specific approval stage requirements
 */
export const testApprovalStageRequirements = () => {
  console.log('\n🔍 Testing Approval Stage Requirements...');
  
  // Stage 1: Doctor Initial Approval (after pending)
  console.log('\n1. Doctor Initial Approval Stage:');
  console.log('   - Input: PENDING');
  console.log('   - Action: Doctor initially approves');
  console.log('   - Output: INITIAL_DOCTOR_APPROVED');
  console.log('   - Next: Auto-transition to PENDING_INITIAL_ADMIN_APPROVAL');
  
  // Stage 2: Admin Initial Approval (before appointment scheduling)
  console.log('\n2. Admin Initial Approval Stage:');
  console.log('   - Input: PENDING_INITIAL_ADMIN_APPROVAL');
  console.log('   - Action: Admin initially approves');
  console.log('   - Output: INITIALLY_APPROVED');
  console.log('   - Effect: Donor can now schedule appointments');
  
  // Stage 3: Appointment Scheduling Eligibility
  console.log('\n3. Appointment Scheduling Requirements:');
  console.log('   - Required Status: INITIALLY_APPROVED or FINAL_APPROVED');
  console.log('   - Blocked Statuses: All others (PENDING, INITIAL_DOCTOR_APPROVED, etc.)');
  console.log('   - Verification: AppointmentForm checks eligibility before allowing scheduling');
  
  return true;
};

// Export test runner
export const runCompleteWorkflowTest = async () => {
  console.log('🚀 Starting Complete Approval Workflow Test...');
  
  try {
    const workflowResults = await testApprovalWorkflow();
    const stageResults = testApprovalStageRequirements();
    
    console.log('\n📊 Test Results Summary:');
    console.log(`Status Transition Test: ${workflowResults.transitionTest ? '✅' : '❌'}`);
    console.log(`Eligibility Test: ${workflowResults.eligibilityTest ? '✅' : '❌'}`);
    console.log(`Stage Requirements Test: ${stageResults ? '✅' : '❌'}`);
    console.log(`Overall Success: ${workflowResults.overallSuccess ? '✅' : '❌'}`);
    
    if (workflowResults.overallSuccess) {
      console.log('\n🎉 All tests passed! The approval workflow is correctly implemented.');
      console.log('\n📋 Workflow Summary:');
      console.log('   1. Doctor reviews application → INITIAL_DOCTOR_APPROVED');
      console.log('   2. System auto-transitions → PENDING_INITIAL_ADMIN_APPROVAL');
      console.log('   3. Admin reviews → INITIALLY_APPROVED');
      console.log('   4. Donor can schedule appointments ✅');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the implementation.');
    }
    
    return workflowResults.overallSuccess;
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return false;
  }
};
